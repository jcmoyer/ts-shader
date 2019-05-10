// Copyright 2019 jcmoyer
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import * as program from 'commander';
import * as process from 'process';
import * as fs from 'fs';
import * as path from 'path';
import { generateClass, CodeGenError } from './codegen';

program
  .usage('<vertex shader> <fragment shader>')
  .option('-e --extends <name>', 'base class of generated class')
  .option('-t --transform-names', 'transform names of class fields for uniforms and attributes')
  .parse(process.argv);

if (program.args.length < 2) {
  program.help();
}

const inputVSFilename = program.args[0];
const inputFSFilename = program.args[1];

if (!fs.existsSync(inputVSFilename)) {
  console.error(`vertex shader does not exist: ${inputVSFilename}`);
  process.exit(1);
}

if (!fs.existsSync(inputFSFilename)) {
  console.error(`fragment shader does not exist: ${inputFSFilename}`);
  process.exit(1);
}

const searchPaths = [path.dirname(inputVSFilename)];

try {
  const classSrc = generateClass({
    inputVS: fs.readFileSync(inputVSFilename).toString(),
    inputFS: fs.readFileSync(inputFSFilename).toString(),
    searchPaths: searchPaths,
    normalizeFieldNames: program.transformNames,
    baseClassName: program.extends
  });

  console.log(classSrc);
} catch (e) {
  if (e instanceof CodeGenError) {
    console.log(`${e.message}: ${e.error.message}`);
    process.exit(1);
  } else {
    throw e;
  }
}
