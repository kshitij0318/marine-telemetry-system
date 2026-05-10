if (process.env.DISABLE_SIMULATORS === 'true') {
  console.log(`[SIM] ${__filename} disabled by DISABLE_SIMULATORS env var. Exiting.`);
  process.exit(0);
}
