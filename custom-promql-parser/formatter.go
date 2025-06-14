package main

import (
	"fmt"
	"regexp"
	"strings"

	"github.com/prometheus/prometheus/promql/parser"
)

// 用于存储变量替换的全局映射
type varMapping struct {
	placeholderToVar map[string]string
	replacedQuery    string
}

// formatPromql takes a PromQL query string and returns a "prettified" version.
func formatPromql(promql string) (string, error) {
	// 先修复 offset 位置问题，对所有查询都执行此操作
	promql = fixOffsetPosition(promql)

	mapping := replaceVariables(promql)
	expr, err := parser.ParseExpr(mapping.replacedQuery)
	// 如果解析失败，直接返回原始查询
	if err != nil {
		return promql, nil
	}

	// 格式化表达式
	var formatted string
	if isSimpleExpr(expr) {
		formatted = expr.Pretty(0)
	} else {
		formatted = customFormat(expr, 0)
	}

	// 如果需要，恢复变量
	for placeholder, variable := range mapping.placeholderToVar {
		formatted = strings.ReplaceAll(formatted, placeholder, variable)
	}

	return formatted, nil
}

// replaceVariables 替换查询中的所有变量，返回映射关系
func replaceVariables(query string) varMapping {
	placeholderToVar := make(map[string]string)
	replacedQuery := query

	// 替换所有的 $变量
	varRegex := regexp.MustCompile(`\$__[a-zA-Z0-9_]+`)
	result := varRegex.ReplaceAllStringFunc(query, func(match string) string {
		placeholder := fmt.Sprintf("VAR%d", len(placeholderToVar))
		placeholderToVar[placeholder] = match
		return placeholder
	})

	replacedQuery = result

	return varMapping{
		placeholderToVar: placeholderToVar,
		replacedQuery:    replacedQuery,
	}
}

// fixOffsetPosition 修复 offset 位置问题
// 将 "metric[time]) offset time" 修改为 "metric[time] offset time)"
func fixOffsetPosition(query string) string {
	// 匹配模式：寻找 [时间范围] 后面紧跟一个或多个右括号，然后是 offset 和时间单位
	regex := regexp.MustCompile(`(\[[^\]]+\])(\)+)\s+offset\s+([a-zA-Z0-9_$][a-zA-Z0-9_$]*)`)

	// 替换为：[时间范围] offset 时间单位 + 相同数量的右括号
	result := regex.ReplaceAllStringFunc(query, func(match string) string {
		submatches := regex.FindStringSubmatch(match)
		if len(submatches) < 4 {
			return match // 如果没有匹配到预期的组，返回原字符串
		}

		timeRange := submatches[1]       // [1m] 或 [$__interval]
		closingBrackets := submatches[2] // ) 或 )) 等
		offsetTime := submatches[3]      // 1d 或 $interval 等

		return fmt.Sprintf("%s offset %s%s", timeRange, offsetTime, closingBrackets)
	})

	return result
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
		if e.Without {
			by = fmt.Sprintf("without (%s)", grouping)
		} else {
			by = fmt.Sprintf("by (%s)", grouping)
		}

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
