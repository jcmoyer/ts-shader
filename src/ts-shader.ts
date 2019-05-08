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
import {
  extractAttributes, extractUniforms,
  shaderClassAttributeName, shaderClassUniformName,
  AttributeInfo, UniformInfo
} from './shaderparse';

// quick and dirty #include implementation
function processIncludes(inputSource: string, searchPath: string, level?: number): string {
  if (level === undefined) {
    level = 0;
  }

  if (level >= 256) {
    console.error('include depth exceeds 256; aborting');
    process.exit(1);
  }

  const includeRegex = /^#include "(.+?)"$/mg;
  const outputSource = inputSource.replace(includeRegex, (include, filename) => {
    const includeFilename = path.join(searchPath, filename);
    if (!fs.existsSync(includeFilename)) {
      console.error(`could not find include: ${includeFilename}`);
      process.exit(1);
    }
    return processIncludes(fs.readFileSync(includeFilename).toString(), searchPath, level + 1);
  });
  return outputSource;
}

program
  .usage('<vertex shader> <fragment shader>')
  .option('-e --extends <name>', 'base class of generated class')
  .option('-t --transform-names', 'transform names of class fields for uniforms and attributes')
  .parse(process.argv);

if (program.args.length < 2) {
  program.help();
}

let options = {
  inputVSFilename: program.args[0],
  inputFSFilename: program.args[1]
};

if (!fs.existsSync(options.inputVSFilename)) {
  console.error(`vertex shader does not exist: ${options.inputVSFilename}`);
  process.exit(1);
}

if (!fs.existsSync(options.inputFSFilename)) {
  console.error(`fragment shader does not exist: ${options.inputFSFilename}`);
  process.exit(1);
}

let attribs: AttributeInfo[];
let uniforms: UniformInfo[];

const outputVSSource = processIncludes(fs.readFileSync(options.inputVSFilename).toString(), path.dirname(path.resolve(options.inputVSFilename)));
attribs = extractAttributes(outputVSSource);
uniforms = extractUniforms(outputVSSource);

const outputFSSource = processIncludes(fs.readFileSync(options.inputFSFilename).toString(), path.dirname(path.resolve(options.inputFSFilename)));
uniforms = uniforms.concat(extractUniforms(outputFSSource));

const tsSource = `
export default class Shader${program.extends ? ` extends ${program.extends}` : ''} {
  ${attribs.map(a => `${program.transformNames ? shaderClassAttributeName(a.name) : a.name}: number;`).join('\n  ')}

  ${uniforms.map(a => `${program.transformNames ? shaderClassUniformName(a.name) : a.name}: WebGLUniformLocation;`).join('\n  ')}

  ${program.extends ? `
  constructor(gl: WebGLRenderingContext) {
    super(gl, Shader.vsSource, Shader.fsSource);
  }
  ` : ''
  }

  static vsSource = \`
${outputVSSource}
\`;
  static fsSource = \`
${outputFSSource}
\`;
}
`

console.log(tsSource);
