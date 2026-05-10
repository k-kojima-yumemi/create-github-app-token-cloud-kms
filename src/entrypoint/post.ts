import * as core from "@actions/core";
import { post } from "../post";

/* v8 ignore next */
post().catch((error) => {
  if (error instanceof Error) {
    core.setFailed(error);
  }
});
