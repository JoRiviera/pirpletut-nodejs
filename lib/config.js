/*
 * Create and export configuration variables
 */

 // The different environments
 var environments = {}

 // Staging Environment - Default
environments.staging = {
    'httpPort':3000, 'httpsPort':3001,'envName':'staging', //so we can display the environment name
    'hashKey' : 'wbs\\q/RW3W.Kx%Zr',
    'maxChecks' : 5
};
 // Production Environment
environments.production = {
    'httpPort':5000, 'httpsPort':5001, 'envName':'production',
    'hashKey' : 'F[Vdf!>%Us?5dGU!',
    'maxChecks' : 5
};

// Find the environment passed in the command line
var currentEnvironment = typeof(process.env.NODE_ENV) == "string" ? process.env.NODE_ENV.toLowerCase() : ""

// Check if it exists, or else put to default
var envToExport = typeof(environments[currentEnvironment]) == "object" ? environments[currentEnvironment] : environments.staging

// Export the configuration
module.exports = envToExport