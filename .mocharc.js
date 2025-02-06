module.exports = {
  timeout: process.env.CI ? 10000 : undefined, // Longer timeout in CI environments
  extension: ['ts'],
  spec: 'test/**/*.spec.ts',
  require: 'ts-node/register',
}
