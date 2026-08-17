const userAgent = process.env.npm_config_user_agent ?? "";

if (!userAgent.startsWith("pnpm/")) {
  process.stderr.write(
    "[publish] blocked: Phoenix Wing workspace packages must be published with pnpm so workspace: dependencies are converted.\n",
  );
  process.stderr.write("[publish] use the ordered pnpm publish commands in docs/发布配置步骤.md\n");
  process.exit(1);
}

process.stdout.write(`[publish] accepted package manager: ${userAgent.split(" ")[0]}\n`);
