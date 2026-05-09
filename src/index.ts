import * as core from "@actions/core";
import { run } from "./main";
import { post } from "./post";

/* v8 ignore next */
if (core.getState("isPost") === "true") {
  post().catch((error) => {
    if (error instanceof Error) {
      core.warning(`Failed to revoke token: ${error.message}`);
    }
  });
} else {
  core.saveState("isPost", "true");
  run().catch((error) => {
    if (error instanceof Error) {
      core.setFailed(error);
    }
  });
}
