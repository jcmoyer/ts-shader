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

export class CodeGenError extends Error {
  constructor(public error: Error, message: string) {
    super(message);
    Object.setPrototypeOf(this, CodeGenError.prototype);
  }
}

function findFile(filename: string, searchPaths: string[]): string {
  for (const searchPath of searchPaths) {
    const fullFilename = path.join(searchPath, filename);
    if (fs.existsSync(fullFilename)) {
      return fullFilename;
    }
  }
  throw new Error(`could not find file ${filename} in any of:\n${searchPaths.join('\n')}`);
}

// quick and dirty #include implementation
async function processIncludes(inputSource: string, searchPaths: string[], level?: number): Promise<string> {
  if (level === undefined) {
    level = 0;
  }

  if (level >= 256) {
    throw new Error('include depth exceeds 256');
  }

  const sourceLines = inputSource.split('\n');
  for (let i = 0; i < sourceLines.length; ++i) {
    const match = sourceLines[i].match(/^#include "(.+?)"$/);
    if (match) {
      const includeFilename = findFile(match[1], searchPaths);
      const includeSource = await fs.promises.readFile(includeFilename);
      sourceLines[i] = await processIncludes(includeSource.toString(), searchPaths, level + 1);
    }
  }
  return sourceLines.join('\n');
}

export async function generateClass(opts: CodeGenOptions) {
  let attribs: AttributeInfo[];
  let uniforms: UniformInfo[];
  let outputVSSource: string;
  let outputFSSource: string;
  try {
    outputVSSource = await processIncludes(opts.inputVS, opts.searchPaths);
    outputFSSource = await processIncludes(opts.inputFS, opts.searchPaths);
  } catch (e) {
    if (e instanceof Error)
      throw new CodeGenError(e, 'error processing includes');
    else
      throw e;
  }

  // attributes can only appear in vertex shaders
  attribs = extractAttributes(outputVSSource);
  // uniforms are shared between both vertex and fragment shaders
  uniforms = extractUniforms(outputVSSource).concat(extractUniforms(outputFSSource));

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

