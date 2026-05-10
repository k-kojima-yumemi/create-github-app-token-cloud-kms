import * as core from "@actions/core";
import { run } from "./run";

run().catch((error) => {
  if (error instanceof Error) {
    core.setFailed(error);
  }
});
