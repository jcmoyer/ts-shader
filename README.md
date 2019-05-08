# ts-shader

ts-shader is an experimental code generator used in [deadrun](https://github.com/jcmoyer/LD44/). It transforms GLSL
shader code into a TypeScript class that automatically gets uniform and attribute locations.

This is pre-pre-pre-pre-alpha quality software. Use at your own risk.

Limitations:

* Does not handle GLSL preprocessor macros.
* Very rigid output formatting (it is currently specialized for my use-case and only my use-case)
