import * as core from "@actions/core";
import { run } from "../main/run";

/* v8 ignore next */
run().catch((error) => {
  if (error instanceof Error) {
    core.setFailed(error);
  }
});
