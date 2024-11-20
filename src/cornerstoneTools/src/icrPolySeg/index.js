import launcher from "./ICRPolySeg.js";

export default class ICRPolySeg {
  constructor() {
    this._instance;
  }

  get instance() {
    if (this._instance) {
      return this._instance;
    }

    throw new Error("ICRPolySeg is not initialized.");
  }

  async initialize(params = {}) {
    this._instance = await launcher({
      locateFile: (f) => {
        if (f.endsWith(".wasm")) {
          const wasmFilePath = `/ICRPolySeg.wasm`;
          console.log(wasmFilePath);
          return wasmFilePath;
        }
        return f;
      },
      ...params,
    });
  }
}
