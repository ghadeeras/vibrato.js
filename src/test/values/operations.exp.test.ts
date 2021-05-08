import { Literal } from "../../prod/values/literal"
import { Add } from "../../prod/values/operations"
import { expectation, specificationsOf, deeplyEquals } from "../testutils"

specificationsOf("Operations", () => {

    specificationsOf("Add", () => {

        specificationsOf("3D vectors", () => {

            const v1 = Literal.vector(1, 2, 3)
            const v2 = Literal.vector(2, 3, 4)
            const expectedResult = [3, 5, 7]
    
            expectation("Calculates the addition of vectors", Add.of(v1, v2), deeplyEquals(expectedResult))
            expectation("Is commutative", Add.of(v2, v1), deeplyEquals(Add.of(v1, v2)))

        })

    })

})
