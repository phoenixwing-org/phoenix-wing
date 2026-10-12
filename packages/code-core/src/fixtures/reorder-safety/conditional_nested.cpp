#include "Sample.h"

Sample::Sample() {}

#if FEATURE_A
void Sample::zeta() {
#ifdef FEATURE_DETAIL
    update();
#else
    reset();
#endif
}
#elif FEATURE_B
void Sample::beta() {}
#else
void Sample::gamma() {}
#endif

void Sample::alpha() {}
