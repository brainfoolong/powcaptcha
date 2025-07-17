package powcaptcha

import (
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"
	"math"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"
)

type Powcaptcha struct {
	VerifiedSolutionsFolder string
	ChallengeSalt           string
}

type ChallengeResult struct {
	Difficulty        int
	PuzzlesString     string
	NumberPuzzles     int
	LengthPerSolution int
	SolutionLengthReq int
	Threshold         int
}

// CreateChallenge generates a challenge string consisting of puzzles, each 32 hex characters long.
func (pc *Powcaptcha) CreateChallenge(puzzles int, difficulty int) (string, error) {
	if puzzles <= 0 {
		puzzles = 50
	}
	if len(pc.ChallengeSalt) <= 0 {
		return "", errors.New("Powcaptcha.challengeSalt required, should be a random value not exposed to solver clients")
	}
	var challenge string = fmt.Sprintf("%d", difficulty)
	for i := 0; i < puzzles; i++ {
		b := make([]byte, 16)
		_, err := rand.Read(b)
		if err != nil {
			return "", fmt.Errorf("failed to generate random bytes: %w", err)
		}
		challenge += hex.EncodeToString(b)
	}
	var out = challenge + pc.Hash(challenge+pc.ChallengeSalt)
	return out, nil
}

// VerifySolution verifies the given solution for the challenge.
func (pc *Powcaptcha) VerifySolution(challengeData, solution string) (bool, error) {
	challengeMeta, err := pc.parseChallengeData(challengeData, true)

	if err != nil {
		return false, err
	}

	if solution == "" || len(solution) != challengeMeta.SolutionLengthReq {
		return false, errors.New("invalid solution")
	}

	// Check if challenge already has been tested
	challengeHash := pc.Hash(challengeData)
	hashFile := filepath.Join(pc.VerifiedSolutionsFolder, challengeHash+".pow")
	if _, err := os.Stat(hashFile); err == nil {
		return false, nil
	}

	for i := 0; i < challengeMeta.NumberPuzzles; i++ {
		start := i * challengeMeta.LengthPerSolution
		end := start + challengeMeta.LengthPerSolution
		iteration := solution[start:end]
		challenge := challengeMeta.PuzzlesString[i*32 : (i+1)*32]
		hashVal := hashInt(challenge + iteration)
		if hashVal > challengeMeta.Threshold {
			return false, nil
		}
	}

	if pc.VerifiedSolutionsFolder == "" {
		return false, errors.New("cannot find VerifiedSolutionsFolder for Powcaptcha")
	}
	if stat, err := os.Stat(pc.VerifiedSolutionsFolder); err != nil || !stat.IsDir() {
		return false, errors.New("cannot find VerifiedSolutionsFolder for Powcaptcha")
	}

	// delete files older than 5 minutes
	timeThreshold := time.Now().Add(-5 * time.Minute)
	files, _ := os.ReadDir(pc.VerifiedSolutionsFolder)
	for _, file := range files {
		if strings.HasSuffix(file.Name(), ".pow") {
			path := filepath.Join(pc.VerifiedSolutionsFolder, file.Name())
			info, _ := file.Info()
			if info.ModTime().Before(timeThreshold) {
				os.Remove(path)
			}
		}
	}
	_ = os.WriteFile(hashFile, []byte{}, 0644)
	return true, nil
}

// SolveChallenge solves the given challenge string and returns the solution.
func (pc *Powcaptcha) SolveChallenge(challengeData string) (string, error) {
	challengeMeta, err := pc.parseChallengeData(challengeData, false)
	if err != nil {
		return "", err
	}
	var solutions []string
	maxIterations := pow10(challengeMeta.Difficulty + 2)
	for i := 0; i < challengeMeta.NumberPuzzles; i++ {
		iteration := pow10(challengeMeta.Difficulty + 1)
		challenge := challengeMeta.PuzzlesString[i*32 : (i+1)*32]
		for ; iteration <= maxIterations; iteration++ {
			hashVal := hashInt(challenge + fmt.Sprintf("%d", iteration))
			if hashVal <= challengeMeta.Threshold {
				solutions = append(solutions, fmt.Sprintf("%d", iteration))
				break
			}
		}
	}
	return strings.Join(solutions, ""), nil
}

// hash is a compute-intensive but non-cryptographic fixed length hash.
func (pc *Powcaptcha) Hash(data string) string {
	var h1 uint32 = 0x811c9dc5
	var h2 uint32 = 0x8b8d2a97
	var h3 uint32 = 0xc9dc5118
	var h4 uint32 = 0x7b9d8b8d
	var prime uint32 = 0x01000193

	for i := 0; i < len(data); i++ {
		b := data[i]

		h1 = (h1 ^ uint32(b))
		h1 = (h1 * prime) & 0xFFFFFFFF

		h2 = (h2 ^ (uint32(b) << 1 & 0xFF))
		h2 = (h2 * prime) & 0xFFFFFFFF

		h3 = (h3 ^ (uint32(b) << 2 & 0xFF))
		h3 = (h3 * prime) & 0xFFFFFFFF

		h4 = (h4 ^ (uint32(b) << 3 & 0xFF))
		h4 = (h4 * prime) & 0xFFFFFFFF
	}
	return fmt.Sprintf("%08x%08x%08x%08x", fmix(h1), fmix(h2), fmix(h3), fmix(h4))
}

// hash is a compute-intensive but non-cryptographic fixed length hash.
func hashInt(data string) int {
	var h1 uint32 = 0x811c9dc5
	var prime uint32 = 0x01000193

	for i := 0; i < len(data); i++ {
		b := data[i]

		h1 = (h1 ^ uint32(b))
		h1 = (h1 * prime) & 0xFFFFFFFF
	}
	return int(fmix(h1))
}

// fmix is an internal hash helper
func fmix(h uint32) uint32 {
	h = h & 0xFFFFFFFF
	h ^= (h >> 16)
	aLow1 := uint32(h & 0xFFFF)
	bLow1 := uint32(0x85ebca6b & 0xFFFF)
	aHigh1 := uint32((h >> 16) & 0xFFFF)
	bHigh1 := uint32((0x85ebca6b >> 16) & 0xFFFF)
	h = (aLow1*bLow1 + (((aHigh1*bLow1 + aLow1*bHigh1) << 16) & 0xFFFFFFFF)) & 0xFFFFFFFF

	h ^= (h >> 13)
	aLow2 := uint32(h & 0xFFFF)
	bLow2 := uint32(0xc2b2ae35 & 0xFFFF)
	aHigh2 := uint32((h >> 16) & 0xFFFF)
	bHigh2 := uint32((0xc2b2ae35 >> 16) & 0xFFFF)
	h = (aLow2*bLow2 + (((aHigh2*bLow2 + aLow2*bHigh2) << 16) & 0xFFFFFFFF)) & 0xFFFFFFFF

	h ^= (h >> 16)

	return uint32(h)
}
func pow10(x int) uint32 {
	if x < 0 {
		return 0
	}
	res := 1
	for i := 0; i < x; i++ {
		res *= 10
	}
	return uint32(res)
}

func (pc *Powcaptcha) parseChallengeData(challengeData string, validateChallenge bool) (ChallengeResult, error) {
	clength := len(challengeData)
	if clength < 33 || ((clength-1)%32) != 0 {
		return ChallengeResult{}, errors.New("Invalid challenge data")
	}
	if validateChallenge && pc.ChallengeSalt == "" {
		return ChallengeResult{}, errors.New("Powcaptcha.challengeSalt required, should be a random value not exposed to solver clients")
	}

	difficulty, err := strconv.Atoi(challengeData[0:1])
	if err != nil {
		return ChallengeResult{}, errors.New("Invalid difficulty character")
	}
	if difficulty < 1 || difficulty > 7 {
		return ChallengeResult{}, errors.New("Invalid difficulty, need to be between 1 and 7")
	}

	puzzlesString := challengeData[1 : clength-32]

	if validateChallenge {
		challengeHashCalculated := pc.Hash(challengeData[0:clength-32] + pc.ChallengeSalt)
		challengeHashGiven := challengeData[clength-32:]
		if challengeHashCalculated != challengeHashGiven {
			return ChallengeResult{}, errors.New("Invalid challenge hash (" + challengeHashCalculated + " vs " + challengeHashGiven + ")")
		}
	}

	numberPuzzles := len(puzzlesString) / 32
	lengthPerSolution := difficulty + 2
	solutionLengthRequired := numberPuzzles * lengthPerSolution
	threshold := int(math.Pow(10, float64(10-difficulty)))

	return ChallengeResult{
		Difficulty:        difficulty,
		PuzzlesString:     puzzlesString,
		NumberPuzzles:     numberPuzzles,
		LengthPerSolution: lengthPerSolution,
		SolutionLengthReq: solutionLengthRequired,
		Threshold:         threshold,
	}, nil
}
