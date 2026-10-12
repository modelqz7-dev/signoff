// What the app shows. Parts set to false stay in the code, ready to come back, but no screen leads
// to them: the canvas (and its templates) is put aside while Nodly stays focused on posts.

export const FEATURES = {
  /** The free canvas: the rail's Canvas, a project's Canvas view and the canvas templates. */
  canvas: false,
  /**
   * My page (the link page for the bio), its screens and the requests it brings. While false the
   * rail and the drawer show neither My page nor Requests, and
   * the logo's switch and the drawer open a "coming soon" note about it instead.
   */
  myPage: false,
}

/** The post plans offered for a new project (see POST_TEMPLATES); the others stay in the code. */
export const SHOWN_POST_TEMPLATES = ["posts-month", "posts-week", "posts-stories"]
