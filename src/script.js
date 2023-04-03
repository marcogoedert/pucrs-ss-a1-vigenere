const fs = require('fs')

const ProgressBar = require('progress');

const { ALPHABET,
  ENGLISH_ALPHABET_FREQUENCY,
  PORTUGUESE_ALPHABET_FREQUENCY } = require('./constants');

const cyphers = ['src/cyphers/20201-teste1.txt', 'src/cyphers/20201-teste2.txt'].map(filePath => fs.readFileSync(filePath, 'utf8'))
const MAX_KEY_LENGTH = 8
const ALPHABET_FREQUENCY = ENGLISH_ALPHABET_FREQUENCY

function getProgressBar(message, total) {
  return new ProgressBar(message, {
    total,
    width: 30
  });
}

function decryptVigenere(cipheredText, maxKeyLength=MAX_KEY_LENGTH) {
  console.log(`\n> Maximum key length: ${maxKeyLength} characters`)
  console.log(`\n> Ciphered text length: ${cipheredText.length} characters\n`)
  // Distribute the ciphered text into subarrays
  const subarrays = distributeCypherByKeyLength(cipheredText);

  // Calculate the IoC for each subarray
  const [iocArray, frequenciesArray] = calculateIoCBySubarray(subarrays);

  // Find the key length with the highest IoC
  const keyLength = findKeyLengthByIoC(iocArray);
  console.log(`\n> Key length with highest IoC: ${keyLength}\n`)

  // Find the shifts for each subarray
  const subtexts = subarrays[keyLength-1];
  const frequencies = frequenciesArray[keyLength-1];
  const shifts = findShifts(subtexts, frequencies);

  // Create the key
  const key = shifts.map(shift => ALPHABET[shift]).join('');
  console.log(`> Key: ${key}\n`)

  // Decipher each subarray
  const clearArrays = decipherSubtexts(subarrays, shifts);

  // Join the subarrays into a single array
  const clearText = joinSubarrays(clearArrays);
  console.log(`> Clear text:\n${clearText}\n`)
  
  return clearText;
}

function distributeCypherByKeyLength(cipheredText, keyLength=MAX_KEY_LENGTH) {
  const progressBar = getProgressBar('Distributing ciphered text by key length [:bar] :percent :etas', cipheredText.length);
  const subArray = [];

  // Create an array of arrays, each one with a length equal to its key length
  for (let i = 1; i <= keyLength; i++) {
    subArray.push(Array(i).fill(0).map(() => []));
  }

  // Distribute the letters of the ciphered text into the subarrays
  for (let i = 0; i < cipheredText.length; i++) {
    progressBar.tick();
    for (let j = 0; j < keyLength; j++) {
      const position = i % (j+1);
      subArray[j][position].push(cipheredText[i]);
    }
  }
  return subArray;
}

// Calculates the IoC for each subtext and returns an array with the results
function calculateIoCBySubarray(keyArray) {
  const progressBar = getProgressBar('Calculating IoC for each key length\t [:bar] :percent :etas', keyArray.length);
  const iocArray = Array(keyArray.length).fill(0).map(() => []);
  const frequenciesArray = Array(keyArray.length).fill(0).map(() => []);

  for (let i = 0; i < keyArray.length; i++) {
    progressBar.tick();
    const subtexts = keyArray[i];

    for (let j = 0; j < subtexts.length; j++) {
      const subtext = subtexts[j]
      const [ioc, frequencies] = calculateIoC(subtext)
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
    if (charCode >= 65 && charCode <= 90) { // uppercase letters
      frequencies[charCode - 65]++;
    } else if (charCode >= 97 && charCode <= 122) { // lowercase letters
      frequencies[charCode - 97]++;
    }
  }

  // Calculate the IC
  let sum = 0;
  for (let i = 0; i < 26; i++) {
    sum += frequencies[i] * frequencies[i];
  }
  const ic = sum / (totalChars * (totalChars - 1));
  return [ic, frequencies]
}

// Returns the key length with the highest IoC
function findKeyLengthByIoC(iocArray) {
  const progressBar = getProgressBar('Calculating key length with highest IoC\t [:bar] :percent :etas', iocArray.length);
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

function findShifts(subtexts, frequencies) {
  const progressBar = getProgressBar('Finding shifts for each subtext\t [:bar] :percent :etas', subtexts.length);
  const shifts = [];
  const keyLength = subtexts.length;
  const mostFrequentAlphabetLetter = ALPHABET[ALPHABET_FREQUENCY.indexOf(Math.max(...ALPHABET_FREQUENCY))];

  for (let i = 0; i < keyLength; i++) {
    progressBar.tick();
    const frequency = frequencies[i];
    const mostFrequentLetter = ALPHABET[frequency.indexOf(Math.max(...frequency))];
    const shift = (mostFrequentLetter.charCodeAt(0) - mostFrequentAlphabetLetter.charCodeAt(0)) % 26;
    shifts.push(shift);
  }

  return shifts;
}

function decipherSubtexts(subtexts, shifts) {
  const progressBar = getProgressBar('Deciphering subtexts\t [:bar] :percent :etas', subtexts.length);
  const clearArrays = Array(subtexts.length).fill(0).map(() => []);

  for (let i = 0; i < subtexts.length; i++) {
    progressBar.tick();
    const subtext = subtexts[i];
    const shift = shifts[i];

    for (let j = 0; j < subtext.length; j++) {
      const clearText = decipher(subtext[j], shift);
      clearArrays[i].push(clearText);
    }
  }

  return clearArrays;
}

function decipher(text, shift) {
  const clearText = [];
  for (let i = 0; i < text.length; i++) {
    const charCode = text[i].charCodeAt(0);
    if (charCode >= 65 && charCode <= 90) { // uppercase letters
      clearText.push(String.fromCharCode(((charCode - 65 - shift + 26) % 26) + 65));
    } else if (charCode >= 97 && charCode <= 122) { // lowercase letters
      clearText.push(String.fromCharCode(((charCode - 97 - shift + 26) % 26) + 97));
    } else {
      clearText.push(text[i]);
    }
  }
  return clearText;
  }

function joinSubarrays(subarrays) {
  const maxLength = Math.max(...subarrays.map(arr => arr.length));
  const progressBar = getProgressBar('Joining subarrays\t [:bar] :percent :etas', maxLength);
  const clearText = [];

  for (let i = 0; i < maxLength; i++) {
    progressBar.tick();
    for (let j = 0; j < subarrays.length; j++) {
      if (i < subarrays[j].length) {
        clearText.push(subarrays[j][i]);
      }
    }
  }
  return clearText.join('');
}

// Main
const clearText = decryptVigenere(cyphers[0]);
