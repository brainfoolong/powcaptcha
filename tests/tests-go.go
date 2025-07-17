package main

import (
  "encoding/json"
  "fmt"
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
  pc := powcaptcha.Powcaptcha {
    VerifiedSolutionsFolder: filepath.Join(currentdir, "../tmp"),
    ChallengeSalt: "randomtestsalt",
  }

  puzzles := 50
  difficulty := 4

  // Read and decode the JSON file
  challengeFile := filepath.Join(currentdir, "challenges.json")
  fileData, err := os.ReadFile(challengeFile)
  if err != nil {
    panic(err)
  }
  var fixedChallenges ChallengeData
  if err := json.Unmarshal(fileData, &fixedChallenges); err != nil {
    panic(err)
  }

  for i, challengeString := range fixedChallenges.Challenges {
    solutionExpected := fixedChallenges.Solutions[i]
    solution, err := pc.SolveChallenge(challengeString, solutionExpected.Difficulty)
    if err != nil {
      panic(err)
    }
    if solution != solutionExpected.Solution {
      panic(fmt.Sprintf("Solution for fixed challenge %d not correct", i))
    }
  }
  logTime("Fixed challenges correctly solved")

  challenge, err := pc.CreateChallenge(puzzles)
  if err != nil {
    panic(err)
  }
  logTime("Challenge created")

  solution, err := pc.SolveChallenge(challenge, difficulty)
  if err != nil {
    panic(err)
  }
  logTime("Challenge solved")

  verification, err := pc.VerifySolution(challenge, solution, difficulty)
  if err != nil {
    panic(err)
  }
  if !verification {
    panic("Cannot verify solution")
  }
  logTime("Solution verified")

  verification, err = pc.VerifySolution(challenge, solution, difficulty)
  if err != nil {
    panic(err)
  }
  if verification {
    panic("Solution already verified but still, verifySolution() returns true")
  }
  logTime("Verifying same challenge again is invalid, this is correct")

  challenge, err = pc.CreateChallenge(puzzles)
  if err != nil {
    panic(err)
  }
  crossChallengePath := filepath.Join(pc.VerifiedSolutionsFolder, "cross-challenge", "go")
  if err := os.WriteFile(crossChallengePath, []byte(challenge), 0777); err != nil {
    panic(err)
  }
}