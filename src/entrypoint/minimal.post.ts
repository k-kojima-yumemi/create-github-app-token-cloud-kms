import { setFailed } from "../actions-wrapper/log";
import { post } from "../post";

/* v8 ignore next */
post().catch((error) => {
  if (error instanceof Error) {
    setFailed(error);
  }
});
