package main

import (
	"fmt"
	"strings"

	"github.com/prometheus/prometheus/promql/parser"
)

// formatPromql takes a PromQL query string and returns a "prettified" version.
func formatPromql(promql string) (string, error) {
	expr, err := parser.ParseExpr(promql)
	if err != nil {
		return "", err
	}

	// For simple expressions, use the built-in Pretty formatter
	if isSimpleExpr(expr) {
		return expr.Pretty(0), nil
	}

	// For complex expressions, use our custom formatter
	return customFormat(expr, 0), nil
}

// isSimpleExpr checks if an expression is simple enough to use the built-in formatter
func isSimpleExpr(expr parser.Expr) bool {
	switch expr.(type) {
	case *parser.BinaryExpr:
		// If this is a complex binary expression, use custom formatting
		return false
	case *parser.ParenExpr:
		// Parenthesized expressions should use custom formatting
		return false
	case *parser.VectorSelector:
		// Simple metric selectors can use built-in formatter
		return true
	default:
		// Default to built-in for anything we don't specially handle
		return true
	}
}

// customFormat formats a PromQL expression with custom indentation and line breaks
func customFormat(expr parser.Expr, level int) string {
	// indent is not used at this level

	switch e := expr.(type) {
	case *parser.BinaryExpr:
		return formatBinaryExpr(e, level)

	case *parser.ParenExpr:
		return formatParenExpr(e, level)

	case *parser.Call:
		args := make([]string, 0, len(e.Args))
		for _, arg := range e.Args {
			args = append(args, customFormat(arg, level+1))
		}
		return fmt.Sprintf("%s(%s)", e.Func.Name, strings.Join(args, ", "))

	case *parser.AggregateExpr:
		grouping := strings.Join(e.Grouping, ", ")
		var by string
		by = fmt.Sprintf("by (%s)", grouping)

		param := customFormat(e.Expr, level)
		return fmt.Sprintf("sum %s (%s)", by, param)

	case *parser.VectorSelector:
		return e.String()

	case *parser.MatrixSelector:
		return e.String()

	case *parser.NumberLiteral:
		return e.String()

	case *parser.StringLiteral:
		return e.String()

	default:
		return expr.String()
	}
}

// formatBinaryExpr formats a binary expression with appropriate spacing and indentation
func formatBinaryExpr(expr *parser.BinaryExpr, level int) string {
	indent := strings.Repeat("    ", level)

	// Special case for logical operators like 'and'
	if expr.Op.String() == "and" || expr.Op.String() == "or" {
		left := customFormat(expr.LHS, level)
		right := customFormat(expr.RHS, level)
		return fmt.Sprintf("%s\n\n%s\n\n%s", left, expr.Op.String(), right)
	}

	// For comparison operators, keep it on the same line
	if isComparisonOperator(expr.Op.String()) {
		left := customFormat(expr.LHS, level)
		right := customFormat(expr.RHS, level)
		return fmt.Sprintf("%s\n%s%s %s", left, indent, expr.Op.String(), right)
	}

	// For other binary operators
	left := customFormat(expr.LHS, level)
	right := customFormat(expr.RHS, level)

	// For division, we want a specific format
	if expr.Op.String() == "/" {
		return fmt.Sprintf("%s\n%s/\n%s", left, indent, right)
	}

	// For subtraction, we want specific indentation
	if expr.Op.String() == "-" {
		return fmt.Sprintf("%s\n%s-\n%s", left, indent, right)
	}

	// For other operators
	return fmt.Sprintf("%s %s %s", left, expr.Op.String(), right)
}

// formatParenExpr formats a parenthesized expression with the desired style
func formatParenExpr(expr *parser.ParenExpr, level int) string {
	indent := strings.Repeat("    ", level)
	innerIndent := strings.Repeat("    ", level+1)

	inner := customFormat(expr.Expr, level+1)

	// If inner expression is a binary expression, we want special formatting
	if _, ok := expr.Expr.(*parser.BinaryExpr); ok {
		return fmt.Sprintf("(\n%s%s\n%s)", innerIndent, inner, indent)
	}

	return fmt.Sprintf("(\n%s%s\n%s)", innerIndent, inner, indent)
}

// isComparisonOperator checks if the operator is a comparison operator
func isComparisonOperator(op string) bool {
	return op == "==" || op == "!=" || op == ">" || op == "<" || op == ">=" || op == "<="
}
