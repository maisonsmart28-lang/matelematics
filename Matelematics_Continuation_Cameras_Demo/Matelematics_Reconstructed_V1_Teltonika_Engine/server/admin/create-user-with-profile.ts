export async function createUserWithProfile(options: {
  createAuth: () => Promise<string>;
  insertProfile: (userId: string) => Promise<void>;
  deleteAuth: (userId: string) => Promise<void>;
  onRollbackFailure: (userId: string, error: unknown) => void;
}): Promise<string> {
  const userId = await options.createAuth();

  try {
    await options.insertProfile(userId);
  } catch (profileError) {
    try {
      await options.deleteAuth(userId);
    } catch (rollbackError) {
      options.onRollbackFailure(userId, rollbackError);
      throw new Error("Auth cleanup failed", { cause: profileError });
    }
    throw profileError;
  }

  return userId;
}
