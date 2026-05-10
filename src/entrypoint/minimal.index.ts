import { setFailed } from "../actions-wrapper/log";
import { run } from "../minimal/run";

run().catch((error) => {
  if (error instanceof Error) {
    setFailed(error);
  }
});
