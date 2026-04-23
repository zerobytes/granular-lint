import { state, after, Group, Button } from '@granularjs/core';

const coupons = state([]);
const selectedCoupon = state(null);

export const CouponSelector = () =>
  after(coupons).compute((coupons) =>
    Group(
      { gap: 'sm' },
      ...coupons.map((coupon) =>
        Button(
          {
            onClick: () => selectedCoupon.set(coupon),
          },
          coupon.code,
        ),
      ),
    ),
  );
