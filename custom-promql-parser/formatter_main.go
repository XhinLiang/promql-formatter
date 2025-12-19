package main

import (
	"fmt"
	"regexp"
	"strings"

	"github.com/VictoriaMetrics/metricsql"
	"github.com/prometheus/prometheus/promql/parser"
)

// VariableManager handles variable substitution and restoration
type VariableManager struct {
	placeholderToVar map[string]string
	counter          int
}

// NewVariableManager creates a new variable manager
func NewVariableManager() *VariableManager {
	return &VariableManager{
		placeholderToVar: make(map[string]string),
	}
}

// ReplaceVariables replaces variables with placeholders and returns the modified query
func (vm *VariableManager) ReplaceVariables(query string) string {
	// Match both $__name and $name variable formats
	varRegex := regexp.MustCompile(`\$(?:__)?[a-zA-Z0-9_]+`)
	return varRegex.ReplaceAllStringFunc(query, func(match string) string {
		placeholder := fmt.Sprintf("VAR%d", vm.counter)
		vm.placeholderToVar[placeholder] = match
		vm.counter++
		return placeholder
	})
}

// RestoreVariables restores original variables in the formatted output
func (vm *VariableManager) RestoreVariables(formatted string) string {
	for placeholder, variable := range vm.placeholderToVar {
		formatted = strings.ReplaceAll(formatted, placeholder, variable)
	}
	return formatted
}

// FormatOptions contains formatting configuration
type FormatOptions struct {
	IndentSize    int
	MaxLineLength int
}

// FormatterVisitor implements the visitor pattern for AST-based formatting
type FormatterVisitor struct {
	output  strings.Builder
	indent  int
	options FormatOptions
}

// NewFormatterVisitor creates a new formatter visitor
func NewFormatterVisitor(options FormatOptions) *FormatterVisitor {
	return &FormatterVisitor{
		options: options,
	}
}

// writeIndent writes indentation to the output
func (v *FormatterVisitor) writeIndent() {
	for i := 0; i < v.indent*v.options.IndentSize; i++ {
		v.output.WriteByte(' ')
	}
}

// increaseIndent increases the indentation level
func (v *FormatterVisitor) increaseIndent() {
	v.indent++
}

// decreaseIndent decreases the indentation level
func (v *FormatterVisitor) decreaseIndent() {
	if v.indent > 0 {
		v.indent--
	}
}

// Result returns the formatted string
func (v *FormatterVisitor) Result() string {
	return v.output.String()
}

// formatExprAST formats an expression using AST visitor pattern
func (v *FormatterVisitor) formatExprAST(expr parser.Expr) {
	switch e := expr.(type) {
	case *parser.BinaryExpr:
		v.formatBinaryExprAST(e)
	case *parser.ParenExpr:
		v.formatParenExprAST(e)
	case *parser.AggregateExpr:
		v.formatAggregateExprAST(e)
	case *parser.Call:
		v.formatCallAST(e)
	case *parser.VectorSelector:
		v.output.WriteString(e.String())
	case *parser.MatrixSelector:
		v.output.WriteString(e.String())
	case *parser.NumberLiteral:
		v.output.WriteString(e.String())
	case *parser.StringLiteral:
		v.output.WriteString(e.String())
	default:
		v.output.WriteString(expr.String())
	}
}

// formatBinaryExprAST formats binary expressions with proper spacing and structure
func (v *FormatterVisitor) formatBinaryExprAST(expr *parser.BinaryExpr) {
	op := expr.Op.String()

	switch {
	case op == "and" || op == "or":
		// Logical operators get special formatting
		v.formatExprAST(expr.LHS)
		v.output.WriteString("\n\n")
		v.output.WriteString(op)

		// Handle vector matching
		if expr.VectorMatching != nil && len(expr.VectorMatching.MatchingLabels) > 0 {
			v.output.WriteString("\n\n")
			if expr.VectorMatching.On {
				v.output.WriteString("on(")
			} else {
				v.output.WriteString("ignoring(")
			}
			v.output.WriteString(strings.Join(expr.VectorMatching.MatchingLabels, ","))
			v.output.WriteString(") ")
		}

		v.output.WriteString("\n\n")
		v.formatExprAST(expr.RHS)

	case op == "/":
		// Division gets line breaks
		v.formatExprAST(expr.LHS)
		v.output.WriteByte('\n')
		v.writeIndent()
		v.output.WriteString("/\n")
		v.formatExprAST(expr.RHS)

	case op == "-":
		// Subtraction gets line breaks
		v.formatExprAST(expr.LHS)
		v.output.WriteByte('\n')
		v.writeIndent()
		v.output.WriteString("-\n")
		v.formatExprAST(expr.RHS)

	case isComparisonOperator(op):
		// Comparison operators
		v.formatExprAST(expr.LHS)
		v.output.WriteByte('\n')
		v.writeIndent()
		v.output.WriteString(op)
		v.output.WriteByte(' ')
		v.formatExprAST(expr.RHS)

	default:
		// Default formatting
		v.formatExprAST(expr.LHS)
		v.output.WriteByte(' ')
		v.output.WriteString(op)
		v.output.WriteByte(' ')
		v.formatExprAST(expr.RHS)
	}
}

// formatParenExprAST formats parenthesized expressions
func (v *FormatterVisitor) formatParenExprAST(expr *parser.ParenExpr) {
	v.output.WriteByte('(')
	v.output.WriteByte('\n')
	v.increaseIndent()
	v.writeIndent()
	v.formatExprAST(expr.Expr)
	v.decreaseIndent()
	v.output.WriteByte('\n')
	v.writeIndent()
	v.output.WriteByte(')')
}

// formatAggregateExprAST formats aggregate expressions
func (v *FormatterVisitor) formatAggregateExprAST(expr *parser.AggregateExpr) {
	v.output.WriteString(expr.Op.String())

	// Add grouping clause
	if len(expr.Grouping) > 0 {
		v.output.WriteByte(' ')
		if expr.Without {
			v.output.WriteString("without (")
		} else {
			v.output.WriteString("by (")
		}
		v.output.WriteString(strings.Join(expr.Grouping, ", "))
		v.output.WriteString(") ")
	} else {
		v.output.WriteByte(' ')
	}

	v.output.WriteByte('(')
	v.formatExprAST(expr.Expr)
	v.output.WriteByte(')')
}

// formatCallAST formats function calls
func (v *FormatterVisitor) formatCallAST(expr *parser.Call) {
	v.output.WriteString(expr.Func.Name)
	v.output.WriteByte('(')

	for i, arg := range expr.Args {
		if i > 0 {
			v.output.WriteString(", ")
		}
		v.formatExprAST(arg)
	}

	v.output.WriteByte(')')
}

// formatPromql takes a PromQL query string and returns a "prettified" version.
func formatPromqlMain(promql string) (string, error) {
	// Try to fix offset position for all queries
	promql = fixOffsetPosition(promql)

	// Replace variables to avoid parser issues
	varManager := NewVariableManager()
	cleanedQuery := varManager.ReplaceVariables(promql)
	expr, err := parser.ParseExpr(cleanedQuery)

	// If parsing fails, return the original query
	if err != nil {
		return promql, nil
	}

	// Format the expression using new AST-based formatter
	var formatted string
	if isSimpleExpr(expr) {
		formatted = expr.Pretty(0)
	} else {
		// Use new AST-based formatter
		options := FormatOptions{
			IndentSize:    4,
			MaxLineLength: 80,
		}
		visitor := NewFormatterVisitor(options)
		visitor.formatExprAST(expr)
		formatted = visitor.Result()
	}

	// Restore original variables
	formatted = varManager.RestoreVariables(formatted)

	validationQuery := NewVariableManager().ReplaceVariables(formatted)
	if _, err := metricsql.Parse(validationQuery); err != nil {
		return "", fmt.Errorf("formatted query is invalid: %v; 请使用 VictoriaMetrics 进行 Format", err)
	}

	return formatted, nil
}

// fixOffsetPosition fixes the position of offset in the query
// Changes "metric[time]) offset time" to "metric[time] offset time)"
// Also handles cases with by clauses like "metric[time])) by (bundle) offset time"
func fixOffsetPosition(query string) string {
	// First, handle "aggr_op(...)) by (...) offset" pattern - works with any aggregation operator
	aggrByRegex := regexp.MustCompile(`([a-zA-Z_][a-zA-Z0-9_]*)\(([^()]+\([^()]+\[[^\]]+\](?:\s*\)+))\)\s+by\s+\(([^)]+)\)\s+offset\s+([a-zA-Z0-9_$][a-zA-Z0-9_$]*)`)
	query = aggrByRegex.ReplaceAllStringFunc(query, func(match string) string {
		submatches := aggrByRegex.FindStringSubmatch(match)
		if len(submatches) < 5 {
			return match
		}

		aggrOp := submatches[1]     // The aggregation operator (sum, avg, etc.)
		innerExpr := submatches[2]  // What's inside aggr_op(...)
		byLabels := submatches[3]   // What's inside by (...)
		offsetTime := submatches[4] // The offset time value

		// Find the last bracket pattern
		bracketRegex := regexp.MustCompile(`(\[[^\]]+\])\s*(\)+)?$`)
		replaced := bracketRegex.ReplaceAllString(innerExpr, fmt.Sprintf("$1 offset %s$2", offsetTime))

		return fmt.Sprintf("%s by (%s) (%s)", aggrOp, byLabels, replaced)
	})

	// Match pattern: [time range] followed by one or more closing brackets,
	// optional "by (labels)" or similar clause, then offset and time unit
	// Now also captures the potential aggregation operator
	offsetRegex := regexp.MustCompile(`(?:([a-zA-Z_][a-zA-Z0-9_]*)\()?([^{(]*\{[^}]*\})?(\[[^\]]+\])(\)+)(?:\s+(?:by|without)\s+\([^)]+\))?\s+offset\s+([a-zA-Z0-9_$][a-zA-Z0-9_$]*)`)

	// Replace with: [time range] offset time unit + same number of closing brackets
	// preserving any aggregation operator
	return offsetRegex.ReplaceAllStringFunc(query, func(match string) string {
		submatches := offsetRegex.FindStringSubmatch(match)
		if len(submatches) < 6 {
			return match // If expected groups not matched, return original string
		}

		aggrOp := submatches[1]          // Optional aggregation operator
		metricSelector := submatches[2]  // Optional metric selector with labels
		timeRange := submatches[3]       // [1m] or [$__interval]
		closingBrackets := submatches[4] // ) or )) etc.
		offsetTime := submatches[5]      // 1d or $interval etc.

		if aggrOp != "" && metricSelector != "" {
			return fmt.Sprintf("%s(%s%s offset %s%s", aggrOp, metricSelector, timeRange, offsetTime, closingBrackets)
		} else if metricSelector != "" {
			return fmt.Sprintf("%s%s offset %s%s", metricSelector, timeRange, offsetTime, closingBrackets)
		} else {
			return fmt.Sprintf("%s offset %s%s", timeRange, offsetTime, closingBrackets)
		}
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

// isComparisonOperator checks if the operator is a comparison operator
func isComparisonOperator(op string) bool {
	switch op {
	case "==", "!=", ">", "<", ">=", "<=":
		return true
	default:
		return false
	}
}
