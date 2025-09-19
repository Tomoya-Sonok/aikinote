import "@testing-library/jest-dom";

// Mock Next.js modules
vi.mock("next/router", () => ({
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    pathname: "/",
    query: {},
    asPath: "/",
  })),
}));

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    pathname: "/",
    query: {},
  })),
  usePathname: vi.fn(() => "/"),
  useSearchParams: vi.fn(() => new URLSearchParams()),
}));

// Mock environment variables
process.env.NEXT_PUBLIC_API_URL = "http://localhost:8787";
process.env.NEXT_PUBLIC_SUPABASE_URL = "http://localhost:54321";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";
process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
