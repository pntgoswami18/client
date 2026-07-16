// Manual mock: @mediapipe/tasks-vision is ESM-only WASM/vision loader code
// that isn't meaningful under jsdom anyway. Auto-applied to every test via
// this root-adjacent __mocks__ dir (see Jest docs on mocking node modules).
module.exports = {
  FilesetResolver: {
    forVisionTasks: jest.fn().mockResolvedValue({ __mockFileset: true }),
  },
  FaceLandmarker: {
    createFromOptions: jest.fn().mockResolvedValue({ __mockLandmarker: true }),
  },
};
