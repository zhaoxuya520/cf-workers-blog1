export type JsonValue =
  | null
  | boolean
  | number
  | string
  | JsonValue[]
  | { [key: string]: JsonValue };

export interface Env {
  ASSETS: Fetcher;
  DB?: D1Database;
  ADMIN_TOKEN?: string;
  ADMIN_LOGIN_USERNAME?: string;
  ADMIN_LOGIN_PASSWORD?: string;
  BLOG_TITLE?: string;
  BLOG_DESCRIPTION?: string;
  AUTHOR_NAME?: string;
  PROFILE_BIO?: string;
  GITHUB_URL?: string;
  EMAIL?: string;
  CORS_ALLOW_ORIGINS?: string;
  SITE_URL?: string;
  SITE_CREATED_AT?: string;
  GISCUS_REPO?: string;
  GISCUS_REPO_ID?: string;
  GISCUS_CATEGORY?: string;
  GISCUS_CATEGORY_ID?: string;
}

export type SiteState = {
  siteConfig: SiteConfig;
  navLinks: NavLink[];
  aiTools: AiTool[];
};

export type SiteConfig = {
  blogTitle: string;
  blogDescription: string;
  authorName: string;
  profileBio: string;
  slogan: string;
  githubUrl: string;
  email: string;
  socialLinks: SocialLink[];
};

export type SocialLink = {
  id: string;
  name: string;
  url: string;
};

export type PostRow = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  tags_json: string;
  cover_url: string;
  content_md: string;
  created_at: number;
  updated_at: number;
};

export type PostListRow = Omit<PostRow, "content_md">;

export type NavLinkRow = {
  id: string;
  label: string;
  href: string;
  sort_order: number;
  open_in_new_tab: number;
  created_at: number;
  updated_at: number;
};

export type NavLink = {
  id: string;
  label: string;
  href: string;
  sortOrder: number;
  openInNewTab: boolean;
};

export type AiToolRow = {
  id: string;
  name: string;
  url: string;
  image_url: string;
  description: string;
  sort_order: number;
  created_at: number;
  updated_at: number;
};

export type AiTool = {
  id: string;
  name: string;
  url: string;
  imageUrl: string;
  description: string;
  sortOrder: number;
};


export type CommentRow = {
  id: string;
  post_slug: string;
  author_name: string;
  content: string;
  ip_hash: string;
  approved: number;
  created_at: number;
};

export type Comment = {
  id: string;
  postSlug: string;
  authorName: string;
  content: string;
  createdAt: number;
};


export type HomeConfig = {
  greeting: string;
  headline: string;
  bio: string;
  projects: HomeProject[];
};

export type HomeProject = {
  icon: string;
  title: string;
  desc: string;
  url: string;
};
