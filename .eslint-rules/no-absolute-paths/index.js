'use strict';

/**
 * @fileoverview Prevent absolute paths in imports and requires
 * @author Your Name
 */

//------------------------------------------------------------------------------
// Rule Definition
//------------------------------------------------------------------------------

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Prevent absolute paths in imports and requires',
      category: 'Possible Errors',
      recommended: true,
    },
    fixable: null,  // or "code" or "whitespace"
    schema: [],
    messages: {
      noAbsolutePath: 'Absolute paths are not allowed. Use path.join() or path.resolve() instead.',
    },
  },

  create(context) {
    //------------------------------------------------------------------
    // Helpers
    //------------------------------------------------------------------

    /**
     * Check if the given string is an absolute path
     * @param {string} path The path to check
     * @returns {boolean} True if the path is absolute, false otherwise
     */
    function isAbsolutePath(path) {
      return (
        path.startsWith('/') || // Unix-like absolute path
        /^[A-Za-z]:\\/.test(path) || // Windows absolute path
        path.startsWith('\\') // Windows UNC path
      );
    }

    //------------------------------------------------------------------
    // Public
    //------------------------------------------------------------------

    return {
      ImportDeclaration(node) {
        if (node.source && node.source.value && isAbsolutePath(node.source.value)) {
          context.report({
            node: node.source,
            messageId: 'noAbsolutePath',
          });
        }
      },
      CallExpression(node) {
        if (
          node.callee.name === 'require' &&
          node.arguments.length > 0 &&
          node.arguments[0].type === 'Literal' &&
          typeof node.arguments[0].value === 'string' &&
          isAbsolutePath(node.arguments[0].value)
        ) {
          context.report({
            node: node.arguments[0],
            messageId: 'noAbsolutePath',
          });
        }
      },
    };
  },
};
