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

import * as path from 'path';
import * as fs from 'fs';
import { AttributeInfo, UniformInfo, extractAttributes, extractUniforms, shaderClassAttributeName, shaderClassUniformName } from './shaderparse';

export interface CodeGenOptions {
  inputVS: string;
  inputFS: string;
  searchPaths: string[];
  baseClassName?: string;
  normalizeFieldNames: boolean;
}

// quick and dirty #include implementation
function processIncludes(inputSource: string, searchPaths: string[], level?: number): string {
  if (level === undefined) {
    level = 0;
  }

  if (level >= 256) {
    console.error('include depth exceeds 256; aborting');
    process.exit(1);
  }

  const includeRegex = /^#include "(.+?)"$/mg;
  const outputSource = inputSource.replace(includeRegex, (include, filename) => {
    for (let searchPath of searchPaths) {
      const includeFilename = path.join(searchPath, filename);
      if (!fs.existsSync(includeFilename)) {
        console.error(`could not find include: ${includeFilename}`);
        process.exit(1);
      }
      return processIncludes(fs.readFileSync(includeFilename).toString(), searchPaths, level + 1);
    }
  });
  return outputSource;
}

export function generateClass(opts: CodeGenOptions) {
  let attribs: AttributeInfo[];
  let uniforms: UniformInfo[];
  
  const outputVSSource = processIncludes(opts.inputVS, opts.searchPaths);
  attribs = extractAttributes(outputVSSource);
  uniforms = extractUniforms(outputVSSource);
  
  const outputFSSource = processIncludes(opts.inputFS, opts.searchPaths);
  uniforms = uniforms.concat(extractUniforms(outputFSSource));
  
  return `
  export default class Shader${opts.baseClassName ? ` extends ${opts.baseClassName}` : ''} {
    ${attribs.map(a => `${opts.normalizeFieldNames ? shaderClassAttributeName(a.name) : a.name}: number;`).join('\n  ')}
  
    ${uniforms.map(a => `${opts.normalizeFieldNames ? shaderClassUniformName(a.name) : a.name}: WebGLUniformLocation;`).join('\n  ')}
  
    ${opts.baseClassName ? `
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
}

