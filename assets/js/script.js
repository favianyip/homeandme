$(document).ready(function() {
    $(".hnm-file__input").change(function(e) {
        $(this).siblings(".hnm-file__txt").text(e.target.files[0].name);
    });

    // Select preference slider start
    $(".hnm-prefer__slider").slick({
        dots: false,
        infinite: true,
        arrows: true,
        speed: 300,
        slidesToShow: 6,
        slidesToScroll: 1,
        responsive: [{
                breakpoint: 1200,
                settings: {
                    slidesToShow: 4
                }
            },
            {
                breakpoint: 992,
                settings: {
                    slidesToShow: 3
                }
            },
            {
                breakpoint: 769,
                settings: {
                    slidesToShow: 2
                }
            },
            {
                breakpoint: 568,
                settings: {
                    slidesToShow: 1
                }
            },
        ]
    });
    // Select preference slider end
    // Texture select slider Start
    var numSlick = 0;
    $('.hnm-custom-item__slider').each(function() {
        numSlick++;
        $(this).addClass('slider-' + numSlick).slick({
            dots: false,
            infinite: true,
            arrows: true,
            speed: 300,
            slidesToShow: 6,
            slidesToScroll: 1,
            responsive: [{
                    breakpoint: 1200,
                    settings: {
                        slidesToShow: 4
                    }
                },
                {
                    breakpoint: 992,
                    settings: {
                        slidesToShow: 3
                    }
                },
                {
                    breakpoint: 769,
                    settings: {
                        slidesToShow: 2
                    }
                },
                {
                    breakpoint: 568,
                    settings: {
                        slidesToShow: 1
                    }
                },
            ]
        });
    });
    // Texture select slider end

    // Config room tile slider start
    $(".hnm-config-room__slider").slick({
        dots: false,
        infinite: true,
        arrows: true,
        speed: 300,
        slidesToShow: 4,
        slidesToScroll: 1,
        responsive: [{
                breakpoint: 1023,
                settings: {
                    slidesToShow: 2
                }
            },
            {
                breakpoint: 567,
                settings: {
                    slidesToShow: 1
                }
            }
        ]
    });
    // Config room tile slider end

    // Image slider popup Start
    $('.hnm-img-slider__for').slick({
        slidesToShow: 1,
        slidesToScroll: 1,
        arrows: true,
        infinite: false,
        fade: true,
        asNavFor: '.hnm-img-slider__nav'
    });
    $('.hnm-img-slider__nav').slick({
        slidesToShow: 7,
        slidesToScroll: 7,
        asNavFor: '.hnm-img-slider__for',
        dots: false,
        arrows: true,
        focusOnSelect: true,
        infinite: false,
        responsive: [{
            breakpoint: 1024,
            settings: {
                slidesToShow: 7,
                slidesToScroll: 7,
            }
        }, {
            breakpoint: 600,
            settings: {
                slidesToShow: 4,
                slidesToScroll: 4,
            }
        }, ]
    });
    $('.modal').on('shown.bs.modal', function(e) {
        $('.hnm-img-slider__for, .hnm-img-slider__nav').slick('setPosition');
        $('.hnm-img-slider__for, .hnm-img-slider__nav, .hnm-img-slider .close').addClass('open');
    });
    // Image slider popup End

    // Custom item tab slider start
    $(".hnm-custom-tab__slider").slick({
        dots: false,
        infinite: true,
        arrows: true,
        speed: 300,
        slidesToShow: 10,
        slidesToScroll: 1,
        // variableWidth: true,
        responsive: [{
                breakpoint: 1194,
                settings: {
                    slidesToShow: 8
                }
            },
            {
                breakpoint: 992,
                settings: {
                    slidesToShow: 5
                }
            },
            {
                breakpoint: 568,
                settings: {
                    slidesToShow: 3
                }
            }
        ]
    });
    // Custom item tab slider end

    // border box slider start
    $(".hnm-custom-item__tab-slider").slick({
        dots: false,
        infinite: true,
        arrows: true,
        speed: 300,
        slidesToShow: 7,
        slidesToScroll: 1,
        variableWidth: true,
        responsive: [{
                breakpoint: 1194,
                settings: {
                    slidesToShow: 8
                }
            },
            {
                breakpoint: 992,
                settings: {
                    slidesToShow: 5
                }
            },
            {
                breakpoint: 568,
                settings: {
                    slidesToShow: 3
                }
            },
            {
                breakpoint: 414,
                settings: {
                    slidesToShow: 2
                }
            }
        ]
    });
    // border box slider end

    // dashbord project selection drop down start
    $(".hnm-sidebar__project-select").click(function() {
        $(this).toggleClass("active");
        $(".hnm-sidebar__project-drop").toggleClass("active");
    });
    $(".hnm-sidebar__project-item").click(function() {
        $(".hnm-sidebar__project-drop, .hnm-sidebar__project-select").removeClass("active");
    });
    // dashbord project selection drop down end

    // dashbord menu selection drop down start
    $(".hnm-sidebar__menu-select").click(function() {
        $(this).toggleClass("active");
        $(".hnm-sidebar__link-area").toggleClass("active");
    });
    $(".hnm-sidebar__link").click(function() {
        $(".hnm-sidebar__menu-select, .hnm-sidebar__link-area").removeClass("active");
    });
    // dashbord menu selection drop down end



    // project detail view drop box Start

    // $(".hnm-project-detail__item-link").click(function() {
    //     $(".hnm-project-detail__drop").not($(this).closest(".hnm-project-detail__row").find(".hnm-project-detail__drop")).removeClass("active");
    //     $(".hnm-project-detail__custom-item").not($(this).closest(".hnm-project-detail__row").find(".hnm-project-detail__custom-item")).removeClass("hide");
    //     $(this).closest(".hnm-project-detail__row").find(".hnm-project-detail__drop").toggleClass("active");
    //     $(this).closest(".hnm-project-detail__row").find(".hnm-project-detail__custom-item").toggleClass("hide");
    // });

    // $(".hnm-project-detail__close").click(function() {
    //     $(".hnm-project-detail__drop").removeClass("active");
    //     $(".hnm-project-detail__custom-item").removeClass("hide");
    // });

    // project detail view drop box End
    $(".hnm-aboutus__carousal").slick({
        dots: true,
        infinite: true,
        arrows: true,
        speed: 300,
        slidesToShow: 1,
        slidesToScroll: 1

    });
    $(".hnm-uploaded-carousal__inner").slick({
        dots: false,
        infinite: true,
        arrows: true,
        speed: 300,
        slidesToShow: 3,
        slidesToScroll: 2

    });
    var input = document.getElementById('upload1');
    var infoArea = document.getElementById('file-name');

    input.addEventListener('change', showFileName);

    function showFileName(event) {


        var input = event.srcElement;


        var fileName = input.files[0].name;


        infoArea.textContent = 'File: ' + fileName;
    }
});