(module

    (import "mem" "stack" (memory $stack 1))

    (import "mem" "allocate64" (func $allocate64 (param $size i32) (result i32)))

    (func $f64_vec2_add (param $v1 i32) (param $v2 i32) (result i32)
        (call $f64_vec2_add_r (local.get $v1) (local.get $v2) (call $allocate64 (i32.const 2)))
    )

    (func $f64_vec2_add_r (param $v1 i32) (param $v2 i32) (param $result i32) (result i32)
        (f64.store offset=0 (local.get $result) (f64.add
            (f64.load offset=0 (local.get $v1))
            (f64.load offset=0 (local.get $v2))
        ))
        (f64.store offset=8 (local.get $result) (f64.add
            (f64.load offset=8 (local.get $v1))
            (f64.load offset=8 (local.get $v2))
        ))
        (local.get $result)
    )
    
    (func $f64_vec3_add (param $v1 i32) (param $v2 i32) (result i32)
        (call $f64_vec3_add_r (local.get $v1) (local.get $v2) (call $allocate64 (i32.const 3)))
    )

    (func $f64_vec3_add_r (param $v1 i32) (param $v2 i32) (param $result i32) (result i32)
        (f64.store offset=0 (local.get $result) (f64.add
            (f64.load offset=0 (local.get $v1))
            (f64.load offset=0 (local.get $v2))
        ))
        (f64.store offset=8 (local.get $result) (f64.add
            (f64.load offset=8 (local.get $v1))
            (f64.load offset=8 (local.get $v2))
        ))
        (f64.store offset=16 (local.get $result) (f64.add
            (f64.load offset=16 (local.get $v1))
            (f64.load offset=16 (local.get $v2))
        ))
        (local.get $result)
    )
    
    (func $f64_vec4_add (param $v1 i32) (param $v2 i32) (result i32)
        (call $f64_vec4_add_r (local.get $v1) (local.get $v2) (call $allocate64 (i32.const 4)))
    )

    (func $f64_vec4_add_r (param $v1 i32) (param $v2 i32) (param $result i32) (result i32)
        (f64.store offset=0 (local.get $result) (f64.add
            (f64.load offset=0 (local.get $v1))
            (f64.load offset=0 (local.get $v2))
        ))
        (f64.store offset=8 (local.get $result) (f64.add
            (f64.load offset=8 (local.get $v1))
            (f64.load offset=8 (local.get $v2))
        ))
        (f64.store offset=16 (local.get $result) (f64.add
            (f64.load offset=16 (local.get $v1))
            (f64.load offset=16 (local.get $v2))
        ))
        (f64.store offset=24 (local.get $result) (f64.add
            (f64.load offset=24 (local.get $v1))
            (f64.load offset=24 (local.get $v2))
        ))
        (local.get $result)
    )
    
    (func $f64_vec_add (param $size i32) (param $v1 i32) (param $v2 i32) (result i32)
        (call $f64_vec_add_r (local.get $size) (local.get $v1) (local.get $v2) (call $allocate64 (local.get $size)))
    )

    (func $f64_vec_add_r (param $size i32) (param $v1 i32) (param $v2 i32) (param $result i32) (result i32)
        (local $offset i32)
        (local $maxOffset i32)
        (local.set $offset (i32.const 0))
        (local.set $maxOffset (i32.shl (local.get $size) (i32.const 3)))
        (loop $L
            (f64.store (i32.add (local.get $result) (local.get $offset)) (f64.add
                (f64.load (i32.add (local.get $v1) (local.get $offset)))
                (f64.load (i32.add (local.get $v2) (local.get $offset)))
            ))
            (local.set $offset (i32.add (local.get $offset) (i32.const 8)))
            (br_if $L (i32.lt_u (local.get $offset) (local.get $maxOffset)))
        )
        (local.get $result)
    )
    
    (export "f64_vec2_add" (func $f64_vec2_add))
    (export "f64_vec2_add_r" (func $f64_vec2_add_r))
    (export "f64_vec3_add" (func $f64_vec3_add))
    (export "f64_vec3_add_r" (func $f64_vec3_add_r))
    (export "f64_vec4_add" (func $f64_vec4_add))
    (export "f64_vec4_add_r" (func $f64_vec4_add_r))
    (export "f64_vec_add" (func $f64_vec_add))
    (export "f64_vec_add_r" (func $f64_vec_add_r))

)