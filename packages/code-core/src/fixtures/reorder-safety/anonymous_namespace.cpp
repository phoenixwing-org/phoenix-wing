#include "Sample.h"

Sample::Sample() {}

void Sample::zeta() {}

namespace {

int combine_values(int left, int right) {
    return left + right;
}

} // namespace

int Sample::alpha() {
    return combine_values(1, 2) + combine_values(3, 4);
}
