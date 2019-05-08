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

export interface UniformInfo {
  precision?: string;
  type: string;
  name: string;
}

export interface AttributeInfo {
  precision?: string;
  type: string;
  name: string;
}

export function extractAttributes(shaderSource: string): AttributeInfo[] {
  const attributes = new Array();
  const attributeRegex = /attribute\s+?((lowp|mediump|highp)\s+?)?(\w+)\s+?(\w+)\s*?;/gm;
  let result;
  while (result = attributeRegex.exec(shaderSource)) {
    attributes.push({
      type: result[3],
      name: result[4]
    });
  }
  return attributes;
}

export function extractUniforms(shaderSource: string): UniformInfo[] {
  const uniforms = new Array();
  const uniformRegex = /uniform\s+?((lowp|mediump|highp)\s+?)?(\w+)\s+?(\w+)\s*?;/gm;
  let result;
  while (result = uniformRegex.exec(shaderSource)) {
    uniforms.push({
      type: result[3],
      name: result[4]
    });
  }
  return uniforms;
}

export function shaderClassUniformName(shaderName: string): string {
  return 'u' + shaderName.charAt(0).toUpperCase() + shaderName.substr(1);
}

export function shaderClassAttributeName(shaderName: string): string {
  return 'a' + shaderName.charAt(0).toUpperCase() + shaderName.substr(1);
}
