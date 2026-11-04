import { Config, Effect } from "effect";
import { assertLocalDatabase } from "@shivaedev/local-postgres/server/assertLocalDatabase.ts";
import { LOCAL_SERVER } from "@shivaedev/local-postgres/server/localPostgres.ts";

export const postgresTestEnvironment = Effect.gen(function* () {
	const connection = yield* Config.String("TEST_DATABASE_URL").pipe(Config.withDefault(`${LOCAL_SERVER}/work_apps_test`));
	const base = yield* assertLocalDatabase(connection, ["work_apps_test"]);
	const url = new URL(base);
	url.pathname = "/work_apps_test_sql";
	const sql = yield* Config.String("PLATFORM_SQL_TEST_DATABASE_URL").pipe(Config.withDefault(url.toString()));
	yield* assertLocalDatabase(sql, ["work_apps_test_sql"]);
	return {
		"PLATFORM_SQL_TEST_DATABASE_URL": sql,
		"TEST_DATABASE_URL": base.toString(),
	};
});
