
module.exports = {
	input: 'tsc-out/offchain/tx/builder/tsc-out/buildWorker.js',
	output: {
		file: 'src/offchain/tx/builder/rollup-out/buildWorker.js',
		format: 'iife'
	}
};
