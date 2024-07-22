const PromoCode = require('../model/promoCode');

const checkPromoCode = async (req, res, next) => {
    const { promocode } = req.body;



    if (promocode) {
       
        try {
            const promoCodeDB = await PromoCode.findOne({ code:promocode });

            if (!promoCodeDB) {
                return res.status(404).json({ msg: 'Promo code not found' });
            }

            if (new Date(promoCodeDB.expirationDate) < new Date()) {
                return res.status(400).json({ msg: 'Promo code has expired' });
            }

            req.discount = promoCodeDB.discount;
            next();
        } catch (error) {
            console.error('Error retrieving promo code:', error);
            res.status(500).json({ msg: 'Server error' });
        }
    }
    else {
        req.discount = 0;
        next();
    }

};

module.exports = checkPromoCode;
