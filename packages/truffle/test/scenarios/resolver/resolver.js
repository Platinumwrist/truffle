var MemoryLogger = require("../memorylogger");
var CommandRunner = require("../commandrunner");
var path = require("path");
var assert = require("assert");
var Server = require("../server");
var Reporter = require("../reporter");
var sandbox = require("../sandbox");
var log = console.log;

describe("Solidity Imports [ @standalone ]", function() {
  var config;
  var project = path.join(__dirname, "../../sources/monorepo");
  var logger = new MemoryLogger();

  before(done => Server.start(done));
  after(done => Server.stop(done));

  /**
   * Directory Structure
   * -------------------
   *
   * + node_modules/
   * |-- nodepkg/
   * |   |-- ImportOfImport.sol # Local import for NodeImport.sol
   * |   |-- NodeImport.sol
   * |
   * + installed_contracts/
   * |-- ethpmpkg/
   * |   |-- EthPMImport.sol
   * |
   * + truffleproject/
   * |-- contracts/
   * |   |-- Importer.sol # This imports everthing
   * |-- node_modules/
   * |   |-- nodepkg/
   * |      |-- LocalNodeImport.sol
   * |-- truffle-config.js
   * |
   * + errorproject/
   * |-- contracts/
   * |   |-- Importer.sol # Imports a non-existent file
   * |
   */

  describe("success", function() {
    before(function() {
      this.timeout(10000);
      return sandbox.create(project, "truffleproject").then(conf => {
        config = conf;
        config.network = "development";
        config.logger = logger;
        config.mocha = {
          reporter: new Reporter(logger)
        };
      });
    });

    it("resolves solidity imports located outside the working directory", function(done) {
      this.timeout(30000);

      CommandRunner.run("compile", config, function(err) {
        const output = logger.contents();
        if (err) {
          log(output);
          return done(err);
        }

        assert(output.includes("./contracts/Importer.sol"));
        assert(output.includes("ethpmpkg/EthPMImport.sol"));
        assert(output.includes("nodepkg/ImportOfImport.sol"));
        assert(output.includes("nodepkg/LocalNodeImport.sol"));
        assert(output.includes("nodepkg/NodeImport.sol"));

        done();
      });
    });
  });

  describe("failure", function() {
    before(function() {
      this.timeout(10000);
      return sandbox.create(project, "errorproject").then(conf => {
        config = conf;
        config.network = "development";
        config.logger = logger;
        config.mocha = {
          reporter: new Reporter(logger)
        };
      });
    });

    it("fails gracefully if an import is not found", function(done) {
      this.timeout(30000);

      CommandRunner.run("compile", config, function(err) {
        const output = logger.contents();
        assert(err);
        assert(output.includes("Error"));
        assert(output.includes("Could not find nodepkg/DoesNotExist.sol"));
        assert(output.includes("Importer.sol"));
        done();
      });
    });
  });
});
