export interface BookmarkInfo {
  title: string;
  url: string;
  tags?: string[];
}

export interface MenuActionContext {
  pageUrl?: string;
  pageTitle?: string;
  selectionText?: string;
}
