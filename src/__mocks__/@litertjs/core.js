// Manual mock: @litertjs/core is ESM-only WASM loader code (no CJS build,
// "type": "module") that isn't meaningful under jsdom anyway. Auto-applied
// to every test via this root-adjacent __mocks__ dir (see Jest docs on
// mocking node modules).
module.exports = {
  loadLiteRt: jest.fn().mockResolvedValue(undefined),
  loadAndCompile: jest.fn().mockResolvedValue({ __mockModel: true }),
  Tensor: class Tensor {},
};
