import { Literal } from "../../prod/values/literal"
import { Add } from "../../prod/values/operations"
import { expectation, specificationsOf, deeplyEquals } from "../testutils"
import { real } from "../../prod/datatypes"
import { Variable } from "../../prod/expressions"

specificationsOf("Operations", () => {

    specificationsOf("Add", () => {

        specificationsOf("3D vectors", () => {

            const v1 = Literal.vector(1, 2, 3)
            const v2 = Literal.vector(2, 3, 4)
            const expectedResult = [3, 5, 7]
    
            expectation("Calculates the addition of vectors", Add.of(v1, v2), [], deeplyEquals(expectedResult))
            expectation("Is commutative", Add.of(v2, v1), [], deeplyEquals(Add.of(v1, v2)))

        })

    })

    specificationsOf("Parametrized Vectors", () => {

        const v = Variable.spreadVectorOf(3, real)
        const namedV = v.named("parametrized")
        expectation("Propagates parameters of vectors", Add.of(v, v), [1, 2, 3, /* + */ 2, 3, 4], deeplyEquals([3, 5, 7]))
        expectation("Propagates parameters of named vectors", Add.of(namedV, namedV), [2, 3, 4, /* + */ 3, 4, 5], deeplyEquals([5, 7, 9]))

    })

})
