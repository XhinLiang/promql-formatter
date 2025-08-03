// +build ignore

package main

import (
	"fmt"
)

func main() {
	// Example 1: Complex query with variables
	query1 := `sum(increase(ads_filter_after_total{env="live", region="$region"}[10m])) by (bundle) offset 1w`
	
	fmt.Println("=== Example 1: Complex query with variables ===")
	fmt.Println("Input:")
	fmt.Println(query1)
	fmt.Println("\nFormatted output:")
	result1, err := formatPromql(query1)
	if err != nil {
		fmt.Printf("Error: %v\n", err)
	} else {
		fmt.Println(result1)
	}
	
	// Example 2: Binary expression with logical operators
	query2 := `(sum(increase(pass_rcmd_gps{l0="true"}[1m])) by (l1) / sum(increase(pass_rcmd_gps{}[1m])) by (l1) < 0.2) and on(l1) (sum(increase(pass_rcmd_gps{}[1m])) by (l1) > 10)`
	
	fmt.Println("\n\n=== Example 2: Complex binary expression ===")
	fmt.Println("Input:")
	fmt.Println(query2)
	fmt.Println("\nFormatted output:")
	result2, err := formatPromql(query2)
	if err != nil {
		fmt.Printf("Error: %v\n", err)
	} else {
		fmt.Println(result2)
	}
}