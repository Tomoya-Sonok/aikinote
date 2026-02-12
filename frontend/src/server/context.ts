export type ServerContext = {
  userId: string | null;
};

export const createServerContext = async (): Promise<ServerContext> => {
  return { userId: null };
};
