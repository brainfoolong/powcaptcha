package main

import (
  "encoding/json"
  "fmt"
	"io/ioutil"
  "os"
  "path/filepath"
  "runtime"
  "time"
  "brainfoolong/powcaptcha"
)

var now = time.Now()

func logTime(msg string) {
  diff := time.Since(now)
  now = time.Now()
  fmt.Printf("%s (Took %.2fms)\n", msg, float64(diff.Microseconds())/1000.0)
}

// Structures to decode challenges.json
type ChallengeData struct {
  Challenges []string         `json:"challenges"`
  Solutions  []ExpectedResult `json:"solutions"`
}

type ExpectedResult struct {
  Difficulty int    `json:"difficulty"`
  Solution   string `json:"solution"`
}

func main() {
  _, currentfile, _, _ := runtime.Caller(0)

  var currentdir = filepath.Dir(currentfile)
  pc := powcaptcha.Powcaptcha{
    TmpFolder: filepath.Join(currentdir, "../tmp"),
  }

  // Read and decode the JSON file
  typesFile := filepath.Join(currentdir, "types.json")
  fileData, err := os.ReadFile(typesFile)
  if err != nil {
    panic(err)
  }
  var types []string
  if err := json.Unmarshal(fileData, &types); err != nil {
    panic(err)
  }

  difficulty := 4

  // Solve and verify fixed challenges
  for _, typeStr := range types {
  
    challengeFile := filepath.Join(currentdir,"../tmp", "cross-challenge", typeStr)
    challengeBytes, err := ioutil.ReadFile(challengeFile)
    if err != nil {
      fmt.Errorf("failed to read challenge file: %w", err)
      panic("Error reading file")
    }
    challenge := string(challengeBytes)
  
    hash := pc.Hash(challenge)
    hashFile := filepath.Join(currentdir,"../tmp", hash+".pow")
    if _, err := os.Stat(hashFile); err == nil {
      _ = os.Remove(hashFile)
    }
  
    solution, err := pc.SolveChallenge(challenge, difficulty)
    if err != nil {
          panic(err)
        }
    logTime(fmt.Sprintf("Challenge from %s solved", typeStr))
  
    verification, err := pc.VerifySolution(challenge, solution, difficulty)
    if err != nil {
          panic(err)
        }
    if _, err := os.Stat(hashFile); err == nil {
      _ = os.Remove(hashFile)
    }

    if !verification {
      panic("cannot verify solution for " + typeStr)
    }
  
    logTime(fmt.Sprintf("Solution for %s verified", typeStr))
  }
}