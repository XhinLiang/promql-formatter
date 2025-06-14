package main

import (
	"fmt"
	"regexp"
	"strings"

	"github.com/prometheus/prometheus/promql/parser"
)

// varMapping stores the mapping between placeholder and original variable names
type varMapping struct {
	placeholderToVar map[string]string
	replacedQuery    string
}

// formatPromql takes a PromQL query string and returns a "prettified" version.
func formatPromql(promql string) (string, error) {
	// Try to fix offset position for all queries
	promql = fixOffsetPosition(promql)

	// Replace variables to avoid parser issues
	mapping := replaceVariables(promql)
	expr, err := parser.ParseExpr(mapping.replacedQuery)

	// If parsing fails, return the original query
	if err != nil {
		return promql, nil
	}

	// Format the expression
	var formatted string
	if isSimpleExpr(expr) {
		formatted = expr.Pretty(0)
	} else {
		formatted = customFormat(expr, 0)
	}

	// Restore original variables
	for placeholder, variable := range mapping.placeholderToVar {
		formatted = strings.ReplaceAll(formatted, placeholder, variable)
	}

	return formatted, nil
}

// replaceVariables replaces all variables in the query to avoid parsing issues
func replaceVariables(query string) varMapping {
	placeholderToVar := make(map[string]string)

	// Match both $__name and $name variable formats
	varRegex := regexp.MustCompile(`\$(?:__)?[a-zA-Z0-9_]+`)
	replacedQuery := varRegex.ReplaceAllStringFunc(query, func(match string) string {
		placeholder := fmt.Sprintf("VAR%d", len(placeholderToVar))
		placeholderToVar[placeholder] = match
		return placeholder
	})

	return varMapping{
		placeholderToVar: placeholderToVar,
		replacedQuery:    replacedQuery,
	}
}

// fixOffsetPosition fixes the position of offset in the query
// Changes "metric[time]) offset time" to "metric[time] offset time)"
func fixOffsetPosition(query string) string {
	// Match pattern: [time range] followed by one or more closing brackets, then offset and time unit
	regex := regexp.MustCompile(`(\[[^\]]+\])(\)+)\s+offset\s+([a-zA-Z0-9_$][a-zA-Z0-9_$]*)`)

	// Replace with: [time range] offset time unit + same number of closing brackets
	return regex.ReplaceAllStringFunc(query, func(match string) string {
		submatches := regex.FindStringSubmatch(match)
		if len(submatches) < 4 {
			return match // If expected groups not matched, return original string
		}

		timeRange := submatches[1]       // [1m] or [$__interval]
		closingBrackets := submatches[2] // ) or )) etc.
		offsetTime := submatches[3]      // 1d or $interval etc.

		return fmt.Sprintf("%s offset %s%s", timeRange, offsetTime, closingBrackets)
	})
}

// isSimpleExpr checks if an expression is simple enough to use the built-in formatter
func isSimpleExpr(expr parser.Expr) bool {
	switch expr.(type) {
	case *parser.VectorSelector:
		// Simple metric selectors can use built-in formatter
		return true
	case *parser.BinaryExpr, *parser.ParenExpr:
		// These need special handling
		return false
	default:
		// Default to built-in for anything we don't specially handle
		return true
	}
}

// customFormat formats a PromQL expression with custom indentation and line breaks
func customFormat(expr parser.Expr, level int) string {
	switch e := expr.(type) {
	case *parser.BinaryExpr:
		return formatBinaryExpr(e, level)

	case *parser.ParenExpr:
		return formatParenExpr(e, level)

	case *parser.Call:
		var builder strings.Builder
		builder.WriteString(e.Func.Name)
		builder.WriteByte('(')

		for i, arg := range e.Args {
			if i > 0 {
				builder.WriteString(", ")
			}
			builder.WriteString(customFormat(arg, level+1))
		}

		builder.WriteByte(')')
		return builder.String()

	case *parser.AggregateExpr:
		var builder strings.Builder
		builder.WriteString("sum ")

		// Format grouping clause
		grouping := strings.Join(e.Grouping, ", ")
		if e.Without {
			fmt.Fprintf(&builder, "without (%s) ", grouping)
		} else {
			fmt.Fprintf(&builder, "by (%s) ", grouping)
		}

		// Format the aggregation parameter
		builder.WriteByte('(')
		builder.WriteString(customFormat(e.Expr, level))
		builder.WriteByte(')')

		return builder.String()

	// For simple expressions, use the default String() method
	default:
		return expr.String()
	}
}

// formatBinaryExpr formats a binary expression with appropriate spacing and indentation
func formatBinaryExpr(expr *parser.BinaryExpr, level int) string {
	indent := strings.Repeat("    ", level)
	left := customFormat(expr.LHS, level)
	right := customFormat(expr.RHS, level)
	op := expr.Op.String()

	var builder strings.Builder

	// Handle different operator types with consistent formatting
	switch {
	// Logical operators get double newlines for better readability
	case op == "and" || op == "or":
		fmt.Fprintf(&builder, "%s\n\n%s\n\n%s", left, op, right)

	// Division gets specific formatting
	case op == "/":
		fmt.Fprintf(&builder, "%s\n%s/\n%s", left, indent, right)

	// Subtraction gets specific formatting
	case op == "-":
		fmt.Fprintf(&builder, "%s\n%s-\n%s", left, indent, right)

	// Comparison operators
	case isComparisonOperator(op):
		fmt.Fprintf(&builder, "%s\n%s%s %s", left, indent, op, right)

	// Default formatting for other operators
	default:
		fmt.Fprintf(&builder, "%s %s %s", left, op, right)
	}

	return builder.String()
}

// formatParenExpr formats a parenthesized expression with the desired style
func formatParenExpr(expr *parser.ParenExpr, level int) string {
	indent := strings.Repeat("    ", level)
	innerIndent := strings.Repeat("    ", level+1)
	inner := customFormat(expr.Expr, level+1)

	var builder strings.Builder

	builder.WriteByte('(')
	builder.WriteByte('\n')
	builder.WriteString(innerIndent)
	builder.WriteString(inner)
	builder.WriteByte('\n')
	builder.WriteString(indent)
	builder.WriteByte(')')

	return builder.String()
}

// isComparisonOperator checks if the operator is a comparison operator
func isComparisonOperator(op string) bool {
	switch op {
	case "==", "!=", ">", "<", ">=", "<=":
		return true
	default:
		return false
	}
}
