import mongoose from "mongoose";

let memoryServer: { getUri: () => string; stop: () => Promise<boolean> } | null =
  null;

/**
 * Connect to MongoDB.
 * If USE_IN_MEMORY_MONGO=true (or MONGODB_URI is missing/local and unreachable),
 * starts an ephemeral in-memory MongoDB for local demos.
 */
export async function connectDB(uri?: string): Promise<string> {
  mongoose.set("strictQuery", true);

  const useMemory =
    process.env.USE_IN_MEMORY_MONGO === "true" ||
    !uri ||
    uri.trim() === "" ||
    uri.includes("REPLACE_ME");

  if (useMemory) {
    const { MongoMemoryServer } = await import("mongodb-memory-server");
    memoryServer = await MongoMemoryServer.create();
    const memUri = memoryServer.getUri();
    await mongoose.connect(memUri);
    console.log("MongoDB connected (in-memory — set MONGODB_URI for real DB)");
    return memUri;
  }

  try {
    await mongoose.connect(uri!);
    console.log("MongoDB connected");
    return uri!;
  } catch (err) {
    console.warn(
      "Could not connect to MONGODB_URI. Falling back to in-memory MongoDB for local use."
    );
    console.warn(String(err));
    const { MongoMemoryServer } = await import("mongodb-memory-server");
    memoryServer = await MongoMemoryServer.create();
    const memUri = memoryServer.getUri();
    await mongoose.connect(memUri);
    console.log("MongoDB connected (in-memory fallback)");
    return memUri;
  }
}

export async function disconnectDB(): Promise<void> {
  await mongoose.disconnect();
  if (memoryServer) {
    await memoryServer.stop();
    memoryServer = null;
  }
}
