(module

    (import "mem" "stack" (memory $stack 1))

    (import "mem" "allocate8" (func $allocate8 (param $size i32) (result i32)))
    (import "mem" "allocate64" (func $allocate64 (param $size i32) (result i32)))

    (func $create_delay (param $delay_length i32) (param $item_size i32) (result i32)
        (local $result i32)
        (local $buffer_size i32)
        (local $buffer_lo_ref i32)
        (local $buffer_hi_ref i32)

        (local.set $buffer_size (i32.mul 
            (local.get $delay_length) 
            (local.get $item_size))
        )
        (if (i32.le_s (local.get $buffer_size) (i32.const 0))
            (then (return (i32.const -1)))
        )

        (local.set $result (call $allocate64
            (i32.const 3) ;; 6 * i32 =  3 * i64 header to store delay attributes and first item ref.
        ))
        (local.set $buffer_lo_ref (call $allocate8
            (local.get $buffer_size)
        ))

        (local.set $buffer_hi_ref (i32.add
            (local.get $buffer_lo_ref)
            (local.get $buffer_size)
        ))

        ;; Write header
        (i32.store offset=0 (local.get $result) (local.get $delay_length))
        (i32.store offset=4 (local.get $result) (local.get $item_size))
        (i32.store offset=8 (local.get $result) (local.get $buffer_size))
        (i32.store offset=12 (local.get $result) (local.get $buffer_lo_ref))
        (i32.store offset=16 (local.get $result) (local.get $buffer_hi_ref))
        (i32.store offset=20 (local.get $result) (local.get $buffer_lo_ref)) ;; First item ref.

        ;; Init buffer
        (memory.fill (local.get $buffer_lo_ref) (i32.const 0) (local.get $buffer_size))

        (local.get $result)
    )

    (func $item_ref (param $delay_ref i32) (param $index i32) (result i32)
        (local $delay_length i32)
        (local $item_size i32)
        (local $buffer_size i32)
        (local $buffer_lo_ref i32)
        (local $buffer_hi_ref i32)
        (local $first_item_ref i32)
        (local $result i32)

        ;; Read header
        (local.set $delay_length (i32.load offset=0 (local.get $delay_ref)))
        (local.set $item_size (i32.load offset=4 (local.get $delay_ref)))
        (local.set $buffer_size (i32.load offset=8 (local.get $delay_ref)))
        (local.set $buffer_lo_ref (i32.load offset=12 (local.get $delay_ref)))
        (local.set $buffer_hi_ref (i32.load offset=16 (local.get $delay_ref)))
        (local.set $first_item_ref (i32.load offset=20 (local.get $delay_ref)))

        (local.set $result (i32.add 
            (local.get $first_item_ref) 
            (i32.mul 
                (i32.rem_s (local.get $index) (local.get $delay_length))
                (local.get $item_size)
            )
        ))
        (if (result i32)
            (i32.lt_s (local.get $result) (local.get $buffer_lo_ref))
            (then (i32.add (local.get $result) (local.get $buffer_size)))
            (else (if (result i32)
                (i32.ge_s (local.get $result) (local.get $buffer_hi_ref))
                (then (i32.sub (local.get $result) (local.get $buffer_size)))
                (else (local.get $result))
            ))
        )
    )

    (func $rotate (param $delay_ref i32) (result i32)
        (local $item_size i32)
        (local $buffer_lo_ref i32)
        (local $buffer_hi_ref i32)
        (local $first_item_ref i32)
        (local $result i32)

        ;; Read header
        (local.set $item_size (i32.load offset=4 (local.get $delay_ref)))
        (local.set $buffer_lo_ref (i32.load offset=12 (local.get $delay_ref)))
        (local.set $buffer_hi_ref (i32.load offset=16 (local.get $delay_ref)))
        (local.set $first_item_ref (i32.load offset=20 (local.get $delay_ref)))

        ;; Move first item ref forward, with wrap around if exceeding buffer bounds.
        (if 
            (i32.eq 
                (local.tee $first_item_ref (i32.add
                    (local.tee $result (local.get $first_item_ref)) ;; Set result while at it.
                    (local.get $item_size)
                ))
                (local.get $buffer_hi_ref)
            ) 
            (then (local.set $first_item_ref (local.get $buffer_lo_ref)))
        )

        (i32.store offset=20 (local.get $delay_ref) (local.get $first_item_ref))
        (local.get $result)
    )

    (export "create_delay" (func $create_delay))
    (export "item_ref" (func $item_ref))
    (export "rotate" (func $rotate))

)