export async function register() {
  // This file is compiled for the edge runtime too. Importing the price scheduler
  // here pulls jsonwebtoken into that bundle, which needs Node's stream module.
  // The scheduler starts on the Node server the first time prices are read.
}
