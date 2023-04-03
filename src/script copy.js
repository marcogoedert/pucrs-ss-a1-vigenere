const cluster = require('cluster');
const fs = require('fs')

const cyphers = ['src/cyphers/20201-teste1.txt', 'src/cyphers/20201-teste2.txt'].map(filePath => fs.readFileSync(filePath, 'utf8'))
const numCPUs = require('os').cpus().length;
const MAX_KEY_LENGTH = 7;
const cipheredText = cyphers[0] // just for dev purposes, will remove later

if (cluster.isMaster) {
  // Create a worker for each CPU
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }

  // When a worker is done, concatenate its chunk and exit the process
  let result = '';
  cluster.on('exit', (worker, code, signal) => {
    console.log(worker.process.pid + ' finished');
    result += worker.process.chunk;
    if (Object.keys(cluster.workers).length === 0) {
      console.log(result);
      process.exit();
    }
  });

  // Distribute the subarrays to the workers
  let index = 0;
  for (const id in cluster.workers) {
    const worker = cluster.workers[id];
    const subArray = processSubArray(index, cipheredText);
    worker.send({ subArray });
    index++;
  }
} else {
  // Wait for the subarray and calculate its IoC
  process.on('message', (message) => {
    const subArray = message.subArray;
    const subArrayLength = subArray.length;
    let ioc = 0;
    for (let i = 0; i < 26; i++) {
      let frequencySum = 0;
      for (let j = 0; j < subArrayLength; j++) {
        const charIndex = (i + j * 26) % subArrayLength;
        const charCode = Array.isArray(subArray[charIndex]) ? -1 : subArray[charIndex].charCodeAt(0) - 65;
        if (charCode === i) {
          frequencySum++;
        }
      }
      ioc += frequencySum * (frequencySum - 1);
    }
    ioc /= subArrayLength * (subArrayLength - 1);
    console.log(`Worker ${process.pid} - IoC: ${ioc}`);

    // Store the chunk and IoC in the worker's process object and notify the master process
    process.chunk = subArray.reduce((acc, subArray) => acc.concat(subArray), []).join('');
    process.ioc = ioc;
    process.send('done');
});
}

// Calculates the subarray for the given worker index
function processSubArray(index, text) {
  const chunkSize = Math.ceil(text.length / (numCPUs - index));
  const startIndex = index * chunkSize;
  const endIndex = Math.min(startIndex + chunkSize, text.length);
  const chunk = text.substring(startIndex, endIndex);
  const subArray = Array.from({ length: MAX_KEY_LENGTH }, () => []);
  chunk.split('').forEach((char, i) => {
    const subArrayIndex = (startIndex + i) % MAX_KEY_LENGTH;
    subArray[subArrayIndex].push(char);
  });
  console.log("subArray",subArray,"\n")
  return subArray;
}