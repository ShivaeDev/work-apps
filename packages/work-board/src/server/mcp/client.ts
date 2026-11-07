import { connect } from "node:net";
import { join } from "node:path";
import * as NodeHttpClient from "@effect/platform-node/NodeHttpClient";
import { Cause, Effect, Layer, Schema } from "effect";
import { HttpClient, HttpClientRequest } from "effect/http";
import { RpcClient, RpcSerialization } from "effect/rpc";
import { RpcClientError } from "effect/rpc/RpcClientError";
import { errorMessage } from "#errorMessage.ts";
import { workContract } from "#rpc/contract.ts";
import { FLEET_VIEW_MS } from "#server/diagnostics/daemon.ts";
import { RPC_PATH } from "#server/http/rpcPolicy.ts";

export class BoardToolError extends Schema.TaggedError<BoardToolError>()("BoardToolError", { message: Schema.String }) {}

function makeClient() {
	return RpcClient.make(workContract, { flatten: true });
}
export type BoardClient = Effect.Success<ReturnType<typeof makeClient>>;

// The Board's Fleet view alone may take its whole budget, and the Board's own index and document reads come on top.
const BOARD_WAIT_SECONDS = FLEET_VIEW_MS / 1000 + 5;

function toolError(directory: string, error: unknown) {
	if (Cause.isTimeoutError(error)) {
		return new BoardToolError({
			message: `The Work Board in ${directory} did not answer within ${BOARD_WAIT_SECONDS} seconds. It may be busy; try again.`,
		});
	}
	if (error instanceof RpcClientError) {
		return new BoardToolError({
			message: `The Work Board in ${directory} is not reachable. Start it with: work-board '${directory.replaceAll("'", "'\\''")}'`,
		});
	}
	return new BoardToolError({ message: errorMessage(error) });
}

export function readBoard<A, E>(directory: string, read: (client: BoardClient) => Effect.Effect<A, E>) {
	const agent = Layer.effect(
		NodeHttpClient.HttpAgent,
		Effect.map(NodeHttpClient.makeAgent({ keepAlive: true }), (agents) => {
			agents.http.createConnection = () => connect(join(directory, "board.sock"));
			return agents;
		}),
	);
	const http = NodeHttpClient.layerNodeHttpNoAgent.pipe(Layer.provide(agent));
	const protocol = RpcClient.layerProtocolHttp({
		transformClient: HttpClient.mapRequest(HttpClientRequest.setUrl(`http://localhost${RPC_PATH}`)),
		url: "http://localhost",
	}).pipe(Layer.provide([http, RpcSerialization.layerNdjson]));
	return Effect.scoped(Effect.flatMap(makeClient(), read)).pipe(
		Effect.provide(protocol),
		Effect.timeout(`${BOARD_WAIT_SECONDS} seconds`),
		Effect.mapError((error) => toolError(directory, error)),
	);
}
