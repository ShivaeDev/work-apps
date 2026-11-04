import * as NodeRuntime from "@effect/platform-node/NodeRuntime";
import * as NodeServices from "@effect/platform-node/NodeServices";
import { Config, Effect } from "effect";
import { dockerEnvironment } from "@shivaedev/local-postgres/server/dockerEnvironment.ts";
import { LocalPostgresError } from "@shivaedev/local-postgres/server/LocalPostgresError.ts";
import { localPostgres } from "@shivaedev/local-postgres/server/localPostgres.ts";
import { postgresTestEnvironment } from "#lib/postgresTestEnvironment.ts";

const setup = Effect.gen(function* () {
	if ((yield* Config.String("NODE_ENV").pipe(Config.withDefault(""))) === "production") {
		return yield* new LocalPostgresError({ message: "Local setup must not run in production." });
	}
	const environment = yield* dockerEnvironment;
	const tests = yield* postgresTestEnvironment;
	yield* localPostgres(environment).prepareDatabases(Object.values(tests));
	yield* Effect.log("Local integration databases are ready.");
});

NodeRuntime.runMain(setup.pipe(Effect.provide(NodeServices.layer)));
