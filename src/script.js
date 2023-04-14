/**
 * This script is used to decrypt a Vigenere ciphered text.
 * The key length is determined by the index of coincidence (IoC).
 * Author: Marco Antônio Gonçalves Goedert
 */

const fs = require("fs");
const readline = require("readline");
const path = require("path");
const ProgressBar = require("progress");

const {
  ALPHABET,
  ENGLISH_ALPHABET_FREQUENCY,
  PORTUGUESE_ALPHABET_FREQUENCY,
} = require("./constants");

const alphabetFrequency = {
  English: ENGLISH_ALPHABET_FREQUENCY,
  Portuguese: PORTUGUESE_ALPHABET_FREQUENCY,
};

const cypherDir = "./src/cyphers/";
const outputDir = "./src/clear/";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function showMenu() {
  let selectedFile;
  let selectedLanguage;
  let maxKeyLength;
  // Get a list of files in the cypher directory
  fs.readdir(cypherDir, (err, files) => {
    if (err) {
      console.error("Error reading cypher directory:", err);
      return;
    }

    console.log('Select a file to decipher (or enter "0" to exit):');
    files.forEach((file, index) => {
      console.log(`${index + 1}. ${file}`);
    });

    rl.question("Enter the number of the file: ", (fileNum) => {
      if (fileNum === "0") {
        rl.close();
        return;
      }

      selectedFile = files[fileNum - 1];
      console.log(`> Selected file: ${selectedFile}`);

      rl.question(
        "Select a language (1 for Portuguese, 2 for English): ",
        (langNum) => {
          if (langNum === "0") {
            rl.close();
            return;
          }

          selectedLanguage = langNum == 1 ? "Portuguese" : "English";
          console.log(`> Selected language: ${selectedLanguage}`);

          rl.question(
            'Enter the maximum key length (or enter "0" to exit): ',
            (maxLength) => {
              if (maxLength === "0") {
                rl.close();
                return;
              }

              maxKeyLength = parseInt(maxLength);
              console.log(`> Selected max key length: ${maxKeyLength}`);
              rl.question(
                'Enter "d" to start deciphering, or any other key to return to the main menu: ',
                (confirmDecipher) => {
                  if (confirmDecipher === "d") {
                    // Do something with the selected file, language, and max key length
                    const cypherText = fs.readFileSync(
                      path.join(cypherDir, selectedFile),
                      "utf8"
                    );
                    const [key, clearText] = decryptVigenere(
                      cypherText,
                      maxKeyLength,
                      alphabetFrequency[selectedLanguage]
                    );
                    // Export the clear text to a file
                    const timestamp = new Date()
                      .toISOString()
                      .replace(/:/g, "-");
                    const selectedFileName = selectedFile.split(".")[0];
                    const fileName = `${timestamp}_${selectedFileName}.txt`;
                    // Create the output directory if it doesn't exist
                    if (!fs.existsSync(outputDir)) {
                      fs.mkdirSync(outputDir, { recursive: true });
                    }
                    // Write the output string to the file
                    fs.writeFile(
                      path.join(outputDir, fileName),
                      clearText,
                      (err) => {
                        if (err) {
                          console.error("Error writing clear text file:", err);
                          return;
                        }
                        console.log(
                          `Clear text file written to ${path.join(
                            outputDir,
                            fileName
                          )}`
                        );
                        showMenu();
                      }
                    );
                  } else {
                    // Return to the main menu
                    showMenu();
                  }
                }
              );
            }
          );
        }
      );
    });
  });
}

function getProgressBar(message, total) {
  return new ProgressBar(message, {
    total,
    width: 30,
  });
}

function decryptVigenere(selectedCypher, maxKeyLength, alphabetFrequency) {
  console.log(`\n> Ciphered text length: ${selectedCypher.length} characters`);
  // Distribute the ciphered text into subarrays
  const subarrays = distributeCypherByKeyLength(selectedCypher, maxKeyLength);
  console.log(`> Created ${subarrays.length} key attemps`);
  // Calculate the IoC for each subarray
  const [iocArray, frequenciesArray] = calculateIoCBySubarray(subarrays);

  // Find the key length with the highest IoC
  const keyLength = findKeyLengthByIoC(iocArray);
  console.log(`> Key length with highest IoC: ${keyLength}`);
  iocArray.forEach((ioc, index) => {
    console.log(`> IoC for key length ${index + 1}: ${ioc}`);
  });
  console.log(`> Highest IoC: ${iocArray[keyLength - 1]}`);
  // Find the shifts for each subarray
  const subtexts = subarrays[keyLength - 1];
  const frequencies = frequenciesArray[keyLength - 1];
  const shifts = findShifts(subtexts, frequencies, alphabetFrequency);

  // Create the key
  const key = shifts.map((shift) => ALPHABET[shift]).join("");
  console.log(`> Key: ${key}`);
  // Decipher each subarray
  const clearArrays = decipherSubtexts(subtexts, shifts);

  // Join the subarrays into a single array
  const clearText = joinSubarrays(clearArrays);

  return [key, clearText];
}

function distributeCypherByKeyLength(selectedCypher, keyLength) {
  const progressBar = getProgressBar(
    "Distributing ciphered text by key length [:bar] :percent :etas",
    selectedCypher.length
  );
  const subArray = [];

  // Create an array of arrays, each one with a length equal to its key length
  for (let i = 1; i <= keyLength; i++) {
    subArray.push(
      Array(i)
        .fill(0)
        .map(() => [])
    );
  }

  // Distribute the letters of the ciphered text into the subarrays
  for (let i = 0; i < selectedCypher.length; i++) {
    progressBar.tick();
    for (let j = 0; j < keyLength; j++) {
      const position = i % (j + 1);
      subArray[j][position].push(selectedCypher[i]);
    }
  }
  return subArray;
}

// Calculates the IoC for each subtext and returns an array with the results
function calculateIoCBySubarray(keyArray) {
  const progressBar = getProgressBar(
    "Calculating IoC for each key length\t [:bar] :percent :etas",
    keyArray.length
  );
  const iocArray = Array(keyArray.length)
    .fill(0)
    .map(() => []);
  const frequenciesArray = Array(keyArray.length)
    .fill(0)
    .map(() => []);

  for (let i = 0; i < keyArray.length; i++) {
    progressBar.tick();
    const subtexts = keyArray[i];

    for (let j = 0; j < subtexts.length; j++) {
      const subtext = subtexts[j];
      const [ioc, frequencies] = calculateIoC(subtext);
      iocArray[i].push(ioc);
      frequenciesArray[i].push(frequencies);
    }
  }

  return [iocArray, frequenciesArray];
}

function calculateIoC(text) {
  const frequencies = new Array(26).fill(0);
  const totalChars = text.length;

  // Count the frequency of each letter in the text
  for (let i = 0; i < totalChars; i++) {
    const charCode = text[i].charCodeAt(0);
    if (charCode >= 65 && charCode <= 90) {
      // uppercase letters
      frequencies[charCode - 65]++;
    } else if (charCode >= 97 && charCode <= 122) {
      // lowercase letters
      frequencies[charCode - 97]++;
    }
  }

  // Calculate the IC
  let sum = 0;
  for (let i = 0; i < 26; i++) {
    sum += frequencies[i] * frequencies[i];
  }
  const ic = sum / (totalChars * (totalChars - 1));
  return [ic, frequencies];
}

// Returns the key length with the highest IoC
function findKeyLengthByIoC(iocArray) {
  const progressBar = getProgressBar(
    "Calculating key length with highest IoC\t [:bar] :percent :etas",
    iocArray.length
  );
  let maxIoC = 0;
  let keyLength = 0;
  for (let i = 0; i < iocArray.length; i++) {
    progressBar.tick();
    if (iocArray[i] > maxIoC) {
      maxIoC = iocArray[i];
      keyLength = i + 1;
    }
  }
  return keyLength;
}

function findShifts(subtexts, frequencies, alphabetFrequency) {
  const progressBar = getProgressBar(
    "Finding shifts for each subtext\t [:bar] :percent :etas",
    subtexts.length
  );
  const shifts = [];
  const keyLength = subtexts.length;
  const mostFrequentAlphabetLetter =
    ALPHABET[
      Object.values(alphabetFrequency).indexOf(
        Math.max(...Object.values(alphabetFrequency))
      )
    ];
  console.log(
    `> Most frequent letter in the alphabet: ${mostFrequentAlphabetLetter}`
  );
  for (let i = 0; i < keyLength; i++) {
    progressBar.tick();
    const frequency = frequencies[i];
    const mostFrequentLetter =
      ALPHABET[frequency.indexOf(Math.max(...frequency))];
    console.log(
      `> Most frequent letter in subtext ${i + 1}: ${mostFrequentLetter}`
    );
    const shift =
      (mostFrequentLetter.charCodeAt(0) -
        mostFrequentAlphabetLetter.charCodeAt(0)) %
      26;
    console.log(`> Shift for subtext ${i + 1}: ${shift}`);
    shifts.push(shift);
  }

  return shifts;
}

function decipherSubtexts(subtexts, shifts) {
  const progressBar = getProgressBar(
    "Deciphering subtexts\t [:bar] :percent :etas",
    subtexts.length
  );
  const clearArrays = [];

  for (let i = 0; i < subtexts.length; i++) {
    progressBar.tick();
    const subtext = subtexts[i];
    const shift = shifts[i];
    const clearText = decipherBlock(subtext, shift);
    clearArrays.push(clearText);
  }
  return clearArrays;
}

function decipherBlock(text, shift) {
  const clearText = [];
  for (let i = 0; i < text.length; i++) {
    const charCode = text[i].charCodeAt(0);
    if (charCode >= 65 && charCode <= 90) {
      // uppercase letters
      clearText.push(
        String.fromCharCode(((charCode - 65 - shift + 26) % 26) + 65)
      );
    } else if (charCode >= 97 && charCode <= 122) {
      // lowercase letters
      clearText.push(
        String.fromCharCode(((charCode - 97 - shift + 26) % 26) + 97)
      );
    } else {
      clearText.push(text[i]);
    }
  }
  return clearText;
}

function joinSubarrays(subarrays) {
  // Get the maximum length of the subarrays
  const maxLength = Math.max(...subarrays.map((arr) => arr.length));
  const progressBar = getProgressBar(
    "Joining subarrays\t [:bar] :percent :etas",
    maxLength
  );
  const clearText = [];

  for (let i = 0; i < maxLength; i++) {
    progressBar.tick();
    for (let j = 0; j < subarrays.length; j++) {
      if (i < subarrays[j].length) {
        clearText.push(...subarrays[j][i]);
      }
    }
  }
  return clearText.join("");
}

showMenu();
