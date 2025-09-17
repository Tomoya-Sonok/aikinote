import { SupabaseAdapter } from "@auth/supabase-adapter";
import bcrypt from "bcryptjs";
import { type NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { getServiceRoleSupabase } from "@/lib/supabase/server";
import { initializeUserTagsIfNeeded } from "@/lib/server/tag";

export const authOptions: NextAuthOptions = {
  adapter: SupabaseAdapter({
    url: process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    secret: process.env.SUPABASE_SERVICE_ROLE_KEY || "",
  }),
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
    signUp: "/signup",
    error: "/error",
  },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    }),
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const supabase = getServiceRoleSupabase();

        const { data: user, error } = await supabase
          .from("User")
          .select("*")
          .eq("email", credentials.email)
          .single();

        if (error || !user) {
          return null;
        }

        // メール認証の確認
        if (!user.is_email_verified) {
          return null;
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.password_hash,
        );

        if (!isPasswordValid) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.username,
          image: user.profile_image_url,
        };
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      // Googleプロバイダー経由でのサインイン時も初期タグを作成
      if (account?.provider === "google" && user.id) {
        try {
          await initializeUserTagsIfNeeded(user.id);
        } catch (error) {
          console.error("初期タグ作成エラー:", error);
          // エラーが発生してもサインイン自体は継続する
        }
      }
      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;

        // Credentials providerでのログイン時に初期タグを作成（初回ログインの場合のみ）
        try {
          await initializeUserTagsIfNeeded(session.user.id);
        } catch (error) {
          console.error("初期タグ作成エラー:", error);
          // エラーが発生してもログイン自体は継続する
        }
      }
      return session;
    },
  },
};
