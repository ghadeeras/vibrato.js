import { Variable } from "../../prod/values/variables"
import { real } from "../../prod/datatypes"
import { expectation, specificationsOf, deeplyEquals } from "../testutils"

specificationsOf("Variable", () => {

    specificationsOf("vector", () => {

            const v = Variable.spreadVectorOf(3, real)
            const expectedResult = [3, 5, 7]
    
            expectation("Uses parameters as components", v, [3, 5, 7], deeplyEquals([3, 5, 7]))

    })

})
