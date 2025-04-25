import "dotenv/config";

export const buildDatabaseURL = () => {
  const pgUser = process.env.PG_USER || "postgres";
  const pgPassword = process.env.PG_USER || "postgres";
  const pgPort = process.env.PG_PORT || "5432";

  return `postgres://${pgUser}:${pgPassword}@postgres:${pgPort}/postgres`;
};
